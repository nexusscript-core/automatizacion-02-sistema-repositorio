// ========================================================
// ⚙️ CONFIGURACIÓN — config.example.gs
// Renombra este archivo a config.gs antes de usar.
// NUNCA subas este archivo con datos reales al repositorio.
// ========================================================

const CONFIG = {

  // --------------------------------------------------
  // 📊 SPREADSHEET
  // ID de la hoja de cálculo principal del sistema.
  // Encuéntralo en la URL:
  // https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
  // --------------------------------------------------
  SHEET_ID: "TU_ID_DE_SPREADSHEET_AQUÍ",

  // --------------------------------------------------
  // 📁 DRIVE
  // ID de la carpeta raíz donde se organizarán
  // todas las solicitudes (Facultad → Programa → Sede → Autor)
  // Encuéntralo en la URL de la carpeta en Drive.
  // --------------------------------------------------
  DRIVE_ROOT_FOLDER_ID: "TU_ID_DE_CARPETA_RAIZ_AQUÍ",

  // --------------------------------------------------
  // ✉️ ADMINISTRADOR
  // Correo que recibe alertas de errores del sistema
  // y actúa como fallback si no hay colaborador activo.
  // --------------------------------------------------
  CORREO_ADMIN: "tucorreo@areandina.edu.co",

  // --------------------------------------------------
  // 🏫 DOMINIO INSTITUCIONAL
  // El sistema rechaza correos que no terminen en este dominio.
  // --------------------------------------------------
  DOMINIO_INSTITUCIONAL: "@areandina.edu.co",

  // --------------------------------------------------
  // 🏷️ NOMBRES DEL SISTEMA
  // Aparecen en correos y encabezados del formulario.
  // --------------------------------------------------
  NOMBRE_SISTEMA:    "Sistema de Cargue Repositorio Digitk",
  NOMBRE_INSTITUCION: "Fundación Universitaria del Área Andina",

  // --------------------------------------------------
  // 📂 CARPETA DE ARCHIVOS TERMINADOS
  // Nombre exacto de la subcarpeta dentro de cada Programa
  // a la que se mueven las carpetas al confirmar cargue en Digitk.
  // --------------------------------------------------
  NOMBRE_CARPETA_TERMINADOS: "Proceso terminado",

  // --------------------------------------------------
  // 📋 HOJAS DEL SPREADSHEET
  // Nombre exacto de la hoja de registro principal.
  // (El setup la crea automáticamente con este nombre.)
  // --------------------------------------------------
  HOJA_RESPUESTAS: "Respuestas de formulario 1",

  // --------------------------------------------------
  // ⏰ TIEMPOS DE ALERTA (en días)
  // DIAS_RECORDATORIO:         no usado actualmente (reservado)
  // DIAS_ALERTA_BIBLIOTECARIO: días en revisión antes de alertar
  // --------------------------------------------------
  DIAS_RECORDATORIO:         5,
  DIAS_ALERTA_BIBLIOTECARIO: 3

};
