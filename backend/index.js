// backend/server.js

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const pdf = require("pdf-parse");

require("dotenv").config();

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json()); // Para parsear JSON

app.get("/", (req, res) => {
  res.send("The server is ready");
});

// Función para extraer texto de un PDF
const extractPDFContent = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
};

// Cargar contenido de los PDF y estructurarlo
let pdfData = {};

const loadPdfData = async () => {
  const pdfFiles = [
    {
      name: "Maestría en Ingeniería y Tecnología Ambiental",
      filePath:
        "./pdfs/Utel_Mx_Fichas_Tecnicas_Maestria_Ingenieria_Tecnologia_Ambiental_5a02b93128.pdf",
    },
    {
      name: "Maestría en Coaching Integral y Organizacional",
      filePath:
        "./pdfs/Utel_Ecuador_Fichas_Tecnicas_Maestria_Coaching_Integral_Organizacional_88b9f67f5d.pdf",
    },
    {
      name: "MBA Maestría en Administración de Negocios",
      filePath:
        "./pdfs/Utel_Mx_Fichas_Tecnicas_Maestr_a_Administracion_De_Negocios_mar24_compressed_50f45c7fd0.pdf",
    },
    {
      name: "Maestría en Educación y Docencia",
      filePath:
        "./pdfs/Utel_Mx_Fichas_Tecnicas_Maestria_Educaciony_Docencia_compressed_f9d10562ca.pdf",
    },
    {
      name: "Maestría en Gestión Directiva de Instituciones de Salud",
      filePath:
        "./pdfs/Utel_Mx_Fichas_Tecnicas_Maestria_Gestion_Directivade_Institucionesde_Salud_compressed_0fe98f541e.pdf",
    },
    {
      name: "Maestría en Mindfulness",
      filePath:
        "./pdfs/Utel_Mx_Fichas_Tecnicas_Maestria_Mindfulness_41d971f1fc.pdf",
    },
  ];

  for (const pdfFile of pdfFiles) {
    const content = await extractPDFContent(pdfFile.filePath);
    pdfData[pdfFile.name] = content;
  }
};

// ${Object.entries(pdfData)
//   .map(([name, content]) => `- ${name}: ${content.slice(0, 100)}...`)
//   .join("\n")}

// Llamada a OpenAI para recomendaciones
const getCareerRecommendation = async (perfil) => {
  const descriptionContent = `A continuación tienes información sobre diferentes maestrías. 
  Maestrías:
   ${Object.entries(pdfData)
     .map(([name, content]) => `- ${name}: ${content.slice(0, 1000)}...`)
     .join("\n")}

   Eres un asesor de maestrías de UTEL UNIVERSIDAD y le recomiendas maestrías a los usuarios de acuerdo a su perfil y las maestrías disponibles. Solo puedes responder con base en las maestrías anteriores. Sino cabe el perfil, le dices que no se ajusta a lo que tenemos hoy en dia disponible.
  `;

  const messageUser = `Este es mi perfil: ${perfil}. ¿Cuál maestría sería la más adecuada de acuerdo a las maestrías anteriores? Dame la respuesta resaltando la maestria en negrilla y una corta descripción de la maestría, dámelo en html, no agregues la etiqueta html`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: descriptionContent,
        },
        {
          role: "user",
          content: messageUser,
        },
      ],
      max_tokens: 500,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );
  console.log(response.data.usage);
  console.log("total_tokens: " + response.data.usage.total_tokens);

  return response.data.choices[0].message.content;
};

app.post("/api/suggest-master", async (req, res) => {
  const { perfil } = req.body;
  try {
    const recommendation = await getCareerRecommendation(perfil);
    res.json(recommendation);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error al procesar la solicitud" });
  }
});

app.post("/api/suggest-bachelor", async (req, res) => {
  const { gustos } = req.body;

  if (!gustos) {
    return res.status(400).send("Por favor, proporciona una lista de gustos.");
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Eres un asesor académico basado en la empresa UTEL UNIVERSIDAD, que sugiere carreras basadas en los gustos y preferencias del usuario.",
          },
          {
            role: "user",
            content: `Mis gustos son: ${gustos}. ¿Qué carrera me recomendarías? Dame un listado de 3 carreras con una descripción breve de cada carrera. Dame la respuesta en html para poder ingresarlo en un dangerouslySetInnerHTML, no agregues la etiqueta html`,
          },
        ],
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data.usage);
    console.log("total_tokens: " + response.data.usage.total_tokens);
    res.json(response.data.choices[0].message.content);
  } catch (error) {
    console.log({ error });
    if (error.response) {
      console.error("Error al comunicarse con OpenAI:", error.response.data);
      return res.status(500).json({ error: "Error de la API de OpenAI." });
    }
    console.error("Error:", error.message);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// Cargar los PDFs al iniciar el servidor
loadPdfData().then(() => {
  console.log("Contenido de PDFs cargado.");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
