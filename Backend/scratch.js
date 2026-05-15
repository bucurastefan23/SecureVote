async function listModels() {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyB-gXvO0GpicnLuIFdOihefXky6kLMKFRI');
    const data = await res.json();
    if(data.error) {
        console.log("API Error:", data.error.message);
        return;
    }
    console.log("Valid Models:");
    data.models.forEach(m => {
        if(m.supportedGenerationMethods.includes('generateContent')) {
            console.log(m.name);
        }
    });
  } catch (e) {
    console.error("Error fetching models:", e.message);
  }
}

listModels();
