from flask import Flask, render_template, jsonify
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

@app.route("/")
def index():
    res = supabase.table("species").select("*").execute()
    species_list = res.data
    return render_template("index.html", species=species_list)

@app.route("/api/gene/<species_id>")
def get_genes(species_id):
    res = supabase.table("gene_info").select("*").eq("species_id", species_id).execute()
    return jsonify(res.data)

if __name__ == "__main__":
    app.run(debug=True)