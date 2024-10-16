from flask import Blueprint, request, jsonify
from .Auth import login_required

schedule_bp = Blueprint("schedule", __name__)

user_events = []


@schedule_bp.route("/schedule", methods=["GET", "POST", "DELETE"])
@login_required
def schedule():
    if request.method == "GET":
        if user_events:
            return jsonify(user_events), 200
        return jsonify({"error": "No events found."}), 404

    if request.method == "POST":
        data = request.json
        if "title" not in data or "date" not in data or "id" not in data:
            return (
                jsonify({"error": "Missing required info. Unable to add event."}),
                400,
            )

        new_event = {
            "id": data["id"],
            "title": data["title"],
            "date": data["date"],
        }
        user_events.append(new_event)

        return jsonify({"msg": "Event successfully added!"}), 200

    if request.method == "DELETE":
        data = request.json
        if "eventId" not in data:
            return jsonify({"msg": "Missing eventId. Unable to delete event."}), 400

        event_id = data["eventId"]

        event_to_delete = next(
            (event for event in user_events if event["id"] == event_id), None
        )
        if not event_to_delete:
            return jsonify({"msg": f"No event found with id {event_id}."}), 404

        user_events.remove(event_to_delete)
        return jsonify({"msg": "Event successfully deleted!"}), 200
