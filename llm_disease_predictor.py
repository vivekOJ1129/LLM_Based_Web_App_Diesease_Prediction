# llm_disease_predictor.py
import streamlit as st
import requests
import wikipedia

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "mistral"

def query_ollama(symptoms):
    prompt = f"""
You are a highly knowledgeable medical assistant.
Given the following symptoms:
{symptoms}

Predict the most likely disease and briefly explain why.
Also suggest possible precautions.
Only mention the disease name in the first line like:
Disease: <name>
Then provide explanation and precautions.
"""
    response = requests.post(OLLAMA_URL, json={
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    })

    if response.status_code == 200:
        return response.json().get("response", "No response from model.")
    else:
        return f"Error {response.status_code}: {response.text}"

def get_wikipedia_summary(disease_name):
    try:
        summary = wikipedia.summary(disease_name, sentences=3)
        return summary
    except Exception as e:
        return f"Could not retrieve information from Wikipedia: {e}"

def suggest_medicines(disease_name):
    disease_name = disease_name.lower()
    common = {
        "cold": "Paracetamol, Cetirizine, or Steam Inhalation",
        "fever": "Paracetamol, Ibuprofen",
        "diabetes": "Metformin, Insulin (doctor prescribed)",
        "asthma": "Inhalers (e.g., Salbutamol), Montelukast",
        "headache": "Paracetamol, Ibuprofen",
        "tonsillitis": "Amoxicillin (if bacterial), Warm saltwater gargle"
    }
    for key in common:
        if key in disease_name:
            return common[key]
    return "Please consult a doctor for specific medication."

# Streamlit UI
st.set_page_config(page_title="AI Disease Predictor", layout="centered")
st.title("🧠 AI-Powered Disease Predictor")

st.markdown("Enter your symptoms (comma-separated) below:")

symptom_input = st.text_input("💬 Symptoms (e.g., fever, cough, headache):")

if st.button("🔍 Predict Disease") and symptom_input.strip():
    with st.spinner("Consulting local AI doctor..."):
        ai_response = query_ollama(symptom_input)

    # Extract disease from response (assumes format starts with "Disease: <name>")
    disease_name = ai_response.splitlines()[0].replace("Disease:", "").strip()

    st.success("Prediction Complete!")
    st.markdown("### 🩺 AI Diagnosis & Advice")
    st.markdown(ai_response)

    st.markdown("### 📚 More About the Disease (Wikipedia)")
    wiki_info = get_wikipedia_summary(disease_name)
    st.info(wiki_info)

    st.markdown("### 💊 Suggested Medicines (General)")
    meds = suggest_medicines(disease_name)
    st.warning(meds)

st.markdown("---")
st.caption("Built with ❤️ using Ollama + Mistral + Streamlit")
