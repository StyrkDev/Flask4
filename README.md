# 📌 Portal de Chamados TI com Flask

Sistema web desenvolvido em Python/Flask para gerenciamento e consulta de chamados de TI.  
Permite login de usuários, consulta por status, exibição de dados provenientes de chatbot e visualização com front-end em HTML + JavaScript.

## 🚀 Funcionalidades

- Login com autenticação
- Listagem de chamados por status ou ID
- Integração com banco de dados MySQL
- Front-end com HTML, CSS e JS
- Organização por rotas e templates (MVC básico)
- Visualização de logs e dados externos

## 🛠️ Tecnologias Utilizadas

- Python 3.10
- Flask
- MySQL
- Jinja2
- HTML/CSS/JavaScript
- Git + GitHub

## 🎬 Demonstração

> [Clique aqui para assistir ao vídeo](https://youtu.be/bKYaTZFu1cM)  

## ▶️ Como Executar Localmente

1. Clone este repositório:

``` bash
git clone https://github.com/SeuUsuario/Flask4
```

2. Estrutura do arquivo .env:

``` bash
MYSQL_HOST=
MYSQL_PORT=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DB=
SECRET_KEY=
```

3. Instale as dependências:

``` python
python -m venv venv
source venv/bin/activate  # No Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

4. Execute a aplicação:

``` python
python app.py
```

## 📂 Estrutura de Pastas

``` bash
Flask4/
│
├── templates/         # HTML + Jinja
├── static/            # CSS e JS
├── models.py          # Modelos e conexão MySQL
├── admin_routes.py    # Rotas administrativas
├── app.py             # Arquivo principal
├── requirements.txt   # Dependências
```

## 🤝 Contribuindo

Sinta-se à vontade para abrir issues ou enviar pull requests. Toda ajuda é bem-vinda!

## 📄 Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

Luis Vieira  
[LinkedIn](https://www.linkedin.com/in/luisfelipevv/)  
[GitHub](https://github.com/StyrkDev)
