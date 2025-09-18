import os
from flask import Flask, render_template, request, jsonify
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

db_config = {
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME")
}

def get_family_tree(root_id):
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id, name, birthdate, deathdate, biography FROM person WHERE id = %s", (root_id,))
    person = cursor.fetchone()
    if not person:
        conn.close()
        return None

    cursor.execute("""
        SELECT p.id, p.name, p.birthdate, p.deathdate, p.biography
        FROM marriage m
        JOIN person p ON (p.id = m.person1_id OR p.id = m.person2_id)
        WHERE (m.person1_id = %s OR m.person2_id = %s)
          AND p.id != %s
        LIMIT 1
    """, (root_id, root_id, root_id))
    spouse = cursor.fetchone()

    cursor.execute("""
        SELECT c.id
        FROM parent_child pc
        JOIN person c ON c.id = pc.child_id
        WHERE pc.parent_id = %s
    """, (root_id,))
    children_ids = [row["id"] for row in cursor.fetchall()]
    children = [get_family_tree(cid) for cid in children_ids]

    conn.close()

    node = {
        "id": person["id"],
        "name": person["name"],
        "birthdate": str(person["birthdate"]) if person["birthdate"] else None,
        "deathdate": str(person["deathdate"]) if person["deathdate"] else None,
        "biography": person["biography"],
        "children": children
    }
    if spouse:
        node["spouse"] = {
            "id": spouse["id"],
            "name": spouse["name"],
            "birthdate": str(spouse["birthdate"]) if spouse["birthdate"] else None,
            "deathdate": str(spouse["deathdate"]) if spouse["deathdate"] else None,
            "biography": spouse["biography"]
        }
    return node

@app.route("/")
def index():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id, name FROM person ORDER BY birthdate DESC")
    people = cursor.fetchall()

    conn.close()
    return render_template("index.html", people=people)

@app.route("/family/<int:person_id>")
def family(person_id):
    family_data = get_family_tree(person_id)
    return jsonify(family_data)

if __name__ == "__main__":
    app.run(debug=True)

