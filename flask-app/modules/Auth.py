from functools import wraps
from flask import session, jsonify, request


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        print("Session:", session.get("user_id"))
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized, please log in"}), 401
        request.user_id = session["user_id"]
        return f(*args, **kwargs)

    return decorated_function
