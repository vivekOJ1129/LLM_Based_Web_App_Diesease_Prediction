import pandas as pd
import json

# Load dataset
df = pd.read_csv("Final_Augmented_dataset_Diseases_and_Symptoms.csv")
df.columns = df.columns.str.strip()  # Clean extra spaces

# Ensure correct column name
df.rename(columns={'diseases': 'Disease'}, inplace=True)

# Optional: Remove duplicates
df = df.drop_duplicates()

# Get symptom columns (all except 'Disease')
symptom_columns = [col for col in df.columns if col != 'Disease']

# Convert to prompt–response format
prompt_response_pairs = []
for _, row in df.iterrows():
    symptoms_present = [symptom for symptom in symptom_columns if row[symptom] == 1]
    symptom_text = ", ".join(symptoms_present)
    prompt = f"Given the symptoms: {symptom_text}, what is the most likely disease?"
    response = row['Disease']
    prompt_response_pairs.append({
        "prompt": prompt,
        "response": response
    })

# Save to JSONL (one JSON per line — ideal for LLM training/fine-tuning)
with open("llm_dataset.jsonl", "w", encoding="utf-8") as f:
    for item in prompt_response_pairs:
        json.dump(item, f)
        f.write('\n')

print(f" Successfully saved {len(prompt_response_pairs)} entries to 'llm_dataset.jsonl'")
