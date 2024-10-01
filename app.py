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


# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Configurar o tempo de vida da sessão (20 minutos)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=5)

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
logging.basicConfig(filename='app.log', level=logging.WARNING)

# Configurar LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Classe do usuário
class User(UserMixin):
    def __init__(self, id, codigo_filial, tipo_user):
        self.id = id
        self.codigo_filial = codigo_filial
        self.tipo_user = tipo_user  # Inclui o tipo de usuário

# Carregar usuário
@login_manager.user_loader
def load_user(user_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM usuarios WHERE id = %s", [user_id])
    user_data = cur.fetchone()
    cur.close()

    if user_data:
        return User(id=user_data['id'], codigo_filial=user_data['codigo_filial'], tipo_user=user_data['tipo_user'])
    return None

# Função para verificar se o usuário é administrador
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.tipo_user != 1:  # tipo_user 1 = administrador
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

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM usuarios WHERE username = %s", [username])
        user_data = cur.fetchone()
        cur.close()

        if user_data:
            # Verifica se o usuário está ativo
            if user_data['inativo'] == 1:  # 1 significa inativo
                flash('Sua conta está inativa. Por favor, entre em contato com o administrador.', 'danger')
                return redirect(url_for('login'))

            stored_password = user_data['password']

            # Verificar se a senha armazenada já é um hash bcrypt
            if not stored_password.startswith('$2b$'):
                # Se a senha não for um hash bcrypt, hashear e atualizar no banco
                hashed_password = bcrypt.hashpw(stored_password.encode('utf-8'), bcrypt.gensalt())

                # Atualizar a senha no banco de dados
                cur = mysql.connection.cursor()
                cur.execute("UPDATE usuarios SET password = %s WHERE username = %s", [hashed_password.decode('utf-8'), username])
                mysql.connection.commit()
                cur.close()

                stored_password = hashed_password  # Usar o hash atualizado para validação

            if isinstance(stored_password, str):
                stored_password = stored_password.encode('utf-8')

            # Verificar se a senha fornecida pelo usuário é válida
            if bcrypt.checkpw(password.encode('utf-8'), stored_password):
                user = User(id=user_data['id'], codigo_filial=user_data['codigo_filial'], tipo_user=user_data['tipo_user'])
                login_user(user)
                session.permanent = True  # Define a sessão como permanente
                return redirect(url_for('home'))
            else:
                flash('Login inválido, tente novamente.', 'danger')
        else:
            flash('Usuário não encontrado.', 'danger')

    return render_template('login.html', form=form)

# Página de logout
@app.route('/logout', methods=['POST'])
@login_required
def logout():
    session.pop('user_id', None)
    logout_user()
    return redirect(url_for('login'))

# Página inicial redirecionando conforme o tipo de usuário e filial
@app.route('/')
@login_required
def home():
    form = DummyForm()
    if current_user.tipo_user == 1:
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

    if current_user.tipo_user == 1:
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
    if current_user.tipo_user == 1:
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
    if current_user.tipo_user == 1:
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

# Página de administração para desbloqueio de usuários/IP
@app.route('/admin', methods=['GET'])
@login_required
@admin_required
def admin_page():
    form = DummyForm()
    return render_template('admin.html',user_type=current_user.tipo_user, form=form)

# Rota para desbloquear o usuário baseado no ID do MySQL
@app.route('/unblock_user', methods=['POST'])
@csrf.exempt
@login_required
@admin_required
def unblock_user():
    user_id = request.form['user_id']
    
    # Atualiza o status de bloqueio no MySQL
    cur = mysql.connection.cursor()
    cur.execute("UPDATE usuarios SET is_blocked = 0 WHERE id = %s", [user_id])
    mysql.connection.commit()
    cur.close()

    flash(f"Usuário com ID {user_id} foi desbloqueado.", "success")
    return redirect(url_for('admin_page'))

# Rota para desbloquear o IP do usuário
@app.route('/unblock_ip', methods=['POST'])
@csrf.exempt
@login_required
@admin_required
def unblock_ip():
    user_ip = request.form['user_ip']
    
    # Desbloquear o IP com o Flask-Limiter
    limiter.clear_limits(user_ip)
    
    flash(f"IP {user_ip} foi desbloqueado.", "success")
    return redirect(url_for('admin_page'))


# Captura de erros globais
@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(f"Server Error: {traceback.format_exc()}")
    return render_template("500.html"), 500

@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404

if __name__ == '__main__':
    app.run(debug=True)
