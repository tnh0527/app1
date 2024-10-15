from flask import Blueprint, request, jsonify

schedule_bp = Blueprint("schedule", __name__)

user_events = []


@schedule_bp.route("/schedule", methods=["GET", "POST"])
def schedule():
    if request.method == "GET":
        print(user_events)
        return jsonify(user_events), 200

    if request.method == "POST":
        data = request.json
        if "title" not in data or "date" not in data or "id" not in data:
            return jsonify({"msg": "Missing required info. Unable to add event."}), 400

        new_event = {
            "id": data["id"],
            "title": data["title"],
            "date": data["date"],
        }
        user_events.append(new_event)

        return jsonify({"msg": "Event successfully added!"}), 200
