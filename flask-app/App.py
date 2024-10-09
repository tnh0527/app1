from flask import Flask
from flask_cors import CORS
from modules import register_routes

app = Flask(__name__)

CORS(app)

register_routes(app)


# @app.route("/")
# def home():
#     return "Back-end Flask"

if __name__ == "__main__":
    app.run(debug=True, port=5000)
