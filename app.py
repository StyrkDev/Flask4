from flask import Flask, render_template, redirect, url_for, request, flash, session
from flask_mysqldb import MySQL
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf import FlaskForm
from wtforms import SubmitField
import os
from dotenv import load_dotenv
import bcrypt
import logging
from functools import wraps
from redis import Redis
import traceback
from datetime import datetime, timedelta
#from flask_cors import CORS
from flask_wtf.csrf import CSRFError
from flask import make_response

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Configurar o tempo de vida da sessão (20 minutos)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=10)

# Conectar ao Redis
redis = Redis(host='localhost', port=6379, db=0)

class DummyForm(FlaskForm):
    submit = SubmitField('Enviar')

# Configurar Limiter com Redis
limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri='redis://localhost:6379/0',  # Usa Redis para tracking de limites
    default_limits=["10 per minute", "30 per hour"]
)

# Configuração de conexão com MySQL usando variáveis de ambiente
app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST')
app.config['MYSQL_PORT'] = int(os.getenv('MYSQL_PORT', 3316))
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD')
app.config['MYSQL_DB'] = os.getenv('MYSQL_DB')
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

# Proteção CSRF
csrf = CSRFProtect(app)
csrf.init_app(app)

# Configuração de segurança para cookies
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax'
)

# Configuração de logs
logging.basicConfig(filename='app.log', level=logging.INFO,
                    format='%(asctime)s %(levelname)s [%(module)s:%(lineno)d] %(message)s')

# Configurar LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Classe do usuario
class User(UserMixin):
    def __init__(self, id, codigo_filial, tipo_user):
        self.id = id
        self.codigo_filial = codigo_filial
        self.tipo_user = tipo_user  # Inclui o tipo de usuario

# Carregar usuario
@login_manager.user_loader
def load_user(user_id):
    cur = mysql.connection.cursor()

    try:
        cur.execute("SELECT * FROM usuarios WHERE id = %s", [user_id])
        user_data = cur.fetchone()
    except Exception as e:
        logging.error(f"Erro ao carregar usuario {user_id}: {str(e)}")
    finally:
        cur.close()

    if user_data:
        logging.info(f"usuario {user_id} carregado com sucesso.")
        return User(id=user_data['id'], codigo_filial=user_data['codigo_filial'], tipo_user=user_data['tipo_user'])
    logging.warning(f"usuario {user_id} não encontrado.")
    return None

# Função para verificar se o usuario é administrador
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.tipo_user not in [2, 3]:  # tipo_user 2 = administrador
            logging.warning(f"Acesso negado ao usuario {current_user.id}. Tipo de usuario: {current_user.tipo_user}")
            flash("Você não tem permissão para acessar essa página.", "danger")
            return redirect(url_for('home'))
        return f(*args, **kwargs)
    return decorated_function

# Função para hashear senhas
def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt)

# Classe de formulário de exemplo
class DummyForm(FlaskForm):
    submit = SubmitField('Submit')

# Página de login com limite de tentativas
@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("5 per minute")  # Limite de tentativas
def login():
    form = DummyForm()
    flash('Por favor, faça login para acessar.', 'info')

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        logging.info(f"Tentativa de login do usuario: {username}")

        cur = mysql.connection.cursor()

        try:
            cur.execute("SELECT * FROM usuarios WHERE username = %s", [username])
            user_data = cur.fetchone()
        except Exception as e:
            logging.error(f"Erro ao buscar usuario {username}: {str(e)}")
        finally:
            cur.close()

        if user_data:
            # Verifica se o usuario está ativo
            if user_data['inativo'] == 1:  # 1 significa inativo
                logging.warning(f"usuario {username} inativo tentou fazer login.")
                flash('Sua conta está inativa. Por favor, entre em contato com o administrador.', 'danger')
                return redirect(url_for('login'))

            stored_password = user_data['password']

            # Verificar se a senha armazenada já é um hash bcrypt
            if not stored_password.startswith('$2b$'):
                # Se a senha não for um hash bcrypt, hashear e atualizar no banco
                hashed_password = bcrypt.hashpw(stored_password.encode('utf-8'), bcrypt.gensalt())

                # Atualizar a senha no banco de dados
                cur = mysql.connection.cursor()
                try:
                    cur.execute("UPDATE usuarios SET password = %s WHERE username = %s",
                                 [hashed_password.decode('utf-8'), username])
                    mysql.connection.commit()
                    logging.info(f"Senha do usuario {username} atualizada para hash bcrypt.")
                except Exception as e:
                    logging.error(f"Erro ao atualizar senha para {username}: {str(e)}")
                finally:
                    cur.close()
                stored_password = hashed_password  # Usar o hash atualizado para validação

            if isinstance(stored_password, str):
                stored_password = stored_password.encode('utf-8')

            # Verificar se a senha fornecida pelo usuario é válida
            if bcrypt.checkpw(password.encode('utf-8'), stored_password):
                user = User(id=user_data['id'], codigo_filial=user_data['codigo_filial'], tipo_user=user_data['tipo_user'])
                login_user(user)
                session.permanent = True  # Define a sessão como permanente
                logging.info(f"usuario {username} logado com sucesso.")
                return redirect(url_for('home'))
            else:
                logging.warning(f"Tentativa de login falhou para {username}: senha inválida.")
                flash('Login inválido, tente novamente.', 'danger')
        else:
            logging.warning(f"usuario {username} não encontrado.")
            flash('usuario não encontrado.', 'danger')

    response = make_response(render_template('login.html', form=form))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Página de logout
@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logging.info(f"usuario {current_user.id} fez logout.")
    session.pop('user_id', None)
    logout_user()
    return redirect(url_for('login'))

# Página inicial redirecionando conforme o tipo de usuario e filial
@app.route('/')
@login_required
def home():
    form = DummyForm()
    if current_user.tipo_user in [2, 3]:
        form = DummyForm()
        return render_template('index.html', user_type=current_user.tipo_user, form=form)
    elif current_user.codigo_filial != 99:
        form = DummyForm()
        return render_template('home_lojas.html', user_type=current_user.tipo_user, form=form)
    else:
        form = DummyForm()
        return render_template('index.html', user_type=current_user.tipo_user, form=form)


# Página de consulta para suporte_chamados
@app.route('/chamados')
@login_required
def chamados():
    cur = mysql.connection.cursor()

    if current_user.tipo_user in [2, 3]:
        cur.execute("SELECT * FROM suporte_chamados")

    elif current_user.codigo_filial == 99:
        setores = session.get('setor', '').split(',')  # Lista de setores separados por vírgula
        if setores:
            queries = []
            params = []
            for s in setores:
                s = s.strip()  # Remove espaços
                queries.append("REPLACE(TRIM(departamento), '\\n', '') REGEXP CONCAT('(^|,)', %s, '(,|$)')")
                params.append(s)
            query = f"SELECT * FROM suporte_chamados WHERE {' OR '.join(queries)}"
            cur.execute(query, params)
            
            # Exibir os resultados antes de aplicar a lógica de filtragem
            print("Departamentos disponíveis no banco de dados:", [chamado['departamento'] for chamado in dados])

        else:
            cur.execute("SELECT * FROM suporte_chamados")

    else:
        filiais = current_user.codigo_filial
        cur.execute("SELECT * FROM suporte_chamados WHERE FIND_IN_SET(codigo_filial, %s)", [filiais])

    dados = cur.fetchall()
    cur.close()

    # Formatando a data de abertura para dd/mm/aaaa
    for chamado in dados:
        if 'data_abertura' in chamado and chamado['data_abertura']:
            chamado['data_abertura'] = chamado['data_abertura'].strftime('%d/%m/%Y')

    form = DummyForm()
    setor = session.get('setor', '')
    return render_template('chamados.html', dados=dados, user_type=current_user.tipo_user, setor=setor, form=form)


# Página de consulta para infra_chamados
@app.route('/infra_chamados')
@login_required
def infra_chamados():
    cur = mysql.connection.cursor()
    if current_user.tipo_user in [2, 3]:
        cur.execute("SELECT * FROM infra_chamados")
    else:
        cur.execute("SELECT * FROM infra_chamados WHERE codigo_filial = %s", [current_user.codigo_filial])
    dados = cur.fetchall()
    cur.close()

    # Formatando a data de abertura para dd/mm/aaaa
    for chamado in dados:
        if 'data_abertura' in chamado and chamado['data_abertura']:
            chamado['data_abertura'] = chamado['data_abertura'].strftime('%d/%m/%Y')

    form = DummyForm()
    return render_template('infra_chamados.html', dados=dados, user_type=current_user.tipo_user, form=form)

# Página de consulta para transporte_chamados
@app.route('/transporte_chamados')
@login_required
def transporte_chamados():
    cur = mysql.connection.cursor()
    if current_user.tipo_user in [2, 3]:
        cur.execute("SELECT * FROM solicitacoes_transporte")
    else:
        cur.execute("SELECT * FROM solicitacoes_transporte WHERE codigo_filial = %s", [current_user.codigo_filial])
    dados = cur.fetchall()
    cur.close()

    # Formatando a data de abertura para dd/mm/aaaa
    for chamado in dados:
        if 'data_abertura' in chamado and chamado['data_abertura']:
            chamado['data_abertura'] = chamado['data_abertura'].strftime('%d/%m/%Y')

    form = DummyForm()
    return render_template('transporte_chamados.html', dados=dados,user_type=current_user.tipo_user, form=form)

# Página de administração para desbloqueio de usuarios/IP
@app.route('/admin', methods=['GET'])
@login_required
@admin_required
def admin_page():
    form = DummyForm()
    return render_template('admin.html',user_type=current_user.tipo_user, form=form)

@app.route('/admin/logs')
@login_required
def view_logs():
    if current_user.tipo_user != 2:
        return "Acesso negado", 403  # Se o usuario não for admin, retorna "Acesso negado"

    form = DummyForm()
    try:
        with open('app.log', 'r') as f:
            log_content = f.read()
    except Exception as e:
        return f"Erro ao ler o log: {str(e)}"
    
    return render_template('logs.html', log_content=log_content, form=form)

# Rota para desbloquear o usuario baseado no ID do MySQL
@app.route('/unblock_user', methods=['POST'])
@csrf.exempt
@login_required
@admin_required
def unblock_user():
    user_id = request.form['user_id']
    
    # Atualiza o status de bloqueio no MySQL
    cur = mysql.connection.cursor()
    try:
        cur.execute("UPDATE usuarios SET is_blocked = 0 WHERE id = %s", [user_id])
        mysql.connection.commit()
        logging.info(f"usuario {user_id} desbloqueado pelo admin {current_user.id}.")
    except Exception as e:
        logging.error(f"Erro ao desbloquear usuario {user_id}: {str(e)}")
    finally:
        cur.close()

    flash(f"usuario com ID {user_id} foi desbloqueado.", "success")
    return redirect(url_for('admin_page'))

# Rota para desbloquear o IP do usuario
@app.route('/unblock_ip', methods=['POST'])
@csrf.exempt
@login_required
@admin_required
def unblock_ip():
    user_ip = request.form['user_ip']
    
    # Desbloquear o IP com o Flask-Limiter
    try:
        limiter.clear_limits(user_ip)
        logging.info(f"IP {user_ip} desbloqueado pelo admin {current_user.id}.")
    except Exception as e:
        logging.error(f"Erro ao desbloquear IP {user_ip}: {str(e)}")

    flash(f"IP {user_ip} foi desbloqueado.", "success")
    return redirect(url_for('admin_page'))

@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    if current_user.is_authenticated:  # Verifica se o usuário está autenticado
        user_id = current_user.user_id  # Ou o campo correspondente ao ID do usuário
        username = current_user.username  # Ou o campo correspondente ao nome de usuário
        logging.info(f'Usuário {user_id} - {username} foi deslogado por inatividade')
    else:
        logging.info('Um usuário não autenticado foi deslogado por inatividade')

    flash('Você foi deslogado por inatividade. Por favor, faça login novamente.', 'warning')
    return redirect(url_for('login'))  # Substitua 'login' pelo nome da sua rota de login

# Captura de erros globais
@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(f"Server Error: {traceback.format_exc()}")
    return render_template("500.html"), 500

@app.errorhandler(404)
def not_found(e):
    logging.warning(f"Página não encontrada: {request.url}")
    return render_template("404.html"), 404

if __name__ == '__main__':
    app.run(debug=True)
