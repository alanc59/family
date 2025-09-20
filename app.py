import os
from flask import Flask, render_template, jsonify
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database connection
db = mysql.connector.connect(
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "family_db")
)

# ---------------------------
# Recursive family tree builder
# ---------------------------
def build_family_tree(person_id):
    cursor = db.cursor(dictionary=True)

    # Get main person
    cursor.execute("SELECT * FROM person WHERE id = %s", (person_id,))
    person = cursor.fetchone()
    if not person:
        return None

    # Get spouses
    cursor.execute("""
        SELECT p.* FROM marriage m
        JOIN person p ON (p.id = m.person1_id OR p.id = m.person2_id)
        WHERE (m.person1_id = %s OR m.person2_id = %s) AND p.id != %s
    """, (person_id, person_id, person_id))
    spouses = cursor.fetchall()

    # Get children
    cursor.execute("""
        SELECT c.* FROM parent_child pc
        JOIN person c ON pc.child_id = c.id
        WHERE pc.parent_id = %s
    """, (person_id,))
    children = cursor.fetchall()

    # Recursively build subtrees for children
    children_wrapped = []
    for child in children:
        subtree = build_family_tree(child["id"])
        if subtree:
            children_wrapped.append(subtree)

    return {
        "person": person,
        "spouses": spouses,
        "children": children_wrapped
    }

# ---------------------------
# Routes
# ---------------------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/people")
def api_people():
    """Return all people, youngest first."""
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM person ORDER BY birthdate DESC")
    people = cursor.fetchall()
    return jsonify(people)

@app.route("/api/person/<int:person_id>")
def api_person(person_id):
    """Return details of a single person."""
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM person WHERE id = %s", (person_id,))
    person = cursor.fetchone()
    if not person:
        return jsonify({"error": "Person not found"}), 404
    return jsonify(person)

@app.route("/api/family/<int:person_id>")
def api_family(person_id):
    """Return the recursive family tree for the given person."""
    tree = build_family_tree(person_id)
    if not tree:
        return jsonify({"error": "Person not found"}), 404
    return jsonify(tree)

# ---------------------------
# Run server
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)

