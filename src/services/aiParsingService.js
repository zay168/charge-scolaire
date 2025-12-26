
/**
 * Service dedicated to extracting structured DST data from raw text using AI (Gemini).
 * This solves the problem of unstructured PDF extraction.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export const aiParsingService = {

    /**
     * Parses raw text into structured DST objects using Google Gemini
     * @param {string} rawText - The messy text extracted from PDF
     * @param {string} apiKey - The user's Google Gemini API Key
     * @returns {Promise<Array>} - Array of DST objects
     */
    async parseDSTWithGemini(rawText, apiKey) {
        if (!rawText || !apiKey) throw new Error("Texte ou Clé API manquante");

        const prompt = `
        Tu es un expert en extraction de données. Voici le contenu brut d'un planning de Devoirs Surveillés (DST) extrait d'un PDF.
        Le texte est potentiellement désordonné. Ta mission est d'en extraire une liste structurée JSON.

        RÈGLES D'EXTRACTION :
        1. Cherche les dates, heures, classes, matières, salles et surveillants.
        2. Le format de sortie doit être STRICTEMENT un tableau JSON d'objets :
        [
            {
                "dst_date": "YYYY-MM-DD",
                "start_time": "HH:MM",
                "end_time": "HH:MM",
                "classes": ["2A", "2B"], (Liste des classes concernées, normalise les noms)
                "subject": "Nom de la matière",
                "professor": "Nom du surveillant ou prof (optionnel)",
                "rooms": ["S101", "S102"], (Liste des salles, optionnel)
                "population_details": "Si mentionné (ex: ALBERT à MARTIN)"
            }
        ]
        3. Si une ligne semble être un DST mais qu'il manque des infos, devine intelligemment via le contexte (ex: même date que la ligne précédente).
        4. Ne renvoie QUE le JSON, rien d'autre (pas de markdown \`\`\`).
        5. Ignore les en-têtes inutiles ou pieds de page.

        TEXTE À ANALYSER :
        ${rawText.substring(0, 15000)} 
        `; // Limit text length just in case

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            // Extract JSON from response text
            let responseText = data.candidates[0].content.parts[0].text;

            // Clean markdown blocks if present
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(responseText);
            return parsed;

        } catch (error) {
            console.error("AI Parsing Error:", error);
            throw new Error("L'IA n'a pas réussi à lire ce document. Vérifiez votre clé API ou le format du fichier.");
        }
    }
};
