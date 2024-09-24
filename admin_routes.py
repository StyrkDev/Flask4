from flask import Blueprint, flash, redirect, url_for
from flask_limiter.util import get_remote_address
from flask_login import login_required
from app import limiter  # Importe o limitador da configuração principal do app

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/unblock/<user_id>', methods=['POST'])
@login_required
def unblock_user(user_id):
    # A lógica para identificar o IP ou usuário específico
    limiter.reset()
    flash(f"Usuário {user_id} foi desbloqueado.", "success")
    return redirect(url_for('admin_page'))

# No seu app.py, não se esqueça de registrar o Blueprint
# app.register_blueprint(admin_bp)
