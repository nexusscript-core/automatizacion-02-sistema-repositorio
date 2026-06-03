// ============================================================
//  Código.gs — Punto de entrada de la Web App
//  Maneja doGet() y doPost() + acciones de gestión por URL
// ============================================================

// ============================================================
//  doGet — Sirve el formulario HTML o procesa acciones de gestión
// ============================================================
function doGet(e) {
  const accion = e.parameter.accion;
  const id     = e.parameter.id;

  // Si la URL trae parámetros de acción (aprobar, rechazar, etc.)
  if (accion && id) {
    return _procesarAccionGestion(accion, id, e.parameter.obs || "");
  }

  // Sin parámetros → muestra el formulario
  return HtmlService.createHtmlOutputFromFile('Formulario')
    .setTitle('TÍTULO DE TU SISTEMA')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
//  doPost — Recibe payload JSON del formulario y lo procesa
//  (alternativa a google.script.run para uso como API REST)
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.parameter.payload || e.postData.contents);
    // Delega el procesamiento al Procesador.gs
    const resultado = procesarFormulario(JSON.stringify(data));
    return _jsonResponse(resultado);
  } catch (err) {
    Logger.log("❌ Error en doPost: " + err.message);
    _notificarErrorAdmin("doPost", err);
    return _jsonResponse({ ok: false, error: err.message });
  }
}

// ============================================================
//  _procesarAccionGestion
//  Maneja los botones de acción del correo del colaborador.
//  Acciones posibles: aprobar | incompleto | rechazar | [tuAccion]
// ============================================================
function _procesarAccionGestion(accion, id, obs) {
  const ss   = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const hoja = ss.getSheetByName(CONFIG.HOJA_CONTROL);
  const datos = hoja.getDataRange().getValues();

  // Buscar la fila por ID
  let filaIdx = -1;
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === id) { filaIdx = i + 1; break; }
  }
  if (filaIdx === -1) {
    return HtmlService.createHtmlOutput("<h2>Solicitud no encontrada: " + id + "</h2>");
  }

  // Mapa de acciones → estados
  // Ajusta según los estados de tu sistema (definidos en ESTADOS en Utilidades.gs)
  const mapaAcciones = {
    "aprobar":    { estado: ESTADOS.APROBADO,    icono: "✅" },
    "incompleto": { estado: ESTADOS.INCOMPLETO,  icono: "⚠️" },
    "rechazar":   { estado: ESTADOS.RECHAZADO,   icono: "❌" }
    // Agrega aquí más acciones si tu flujo lo requiere
  };

  const accionData = mapaAcciones[accion];
  if (!accionData) {
    return HtmlService.createHtmlOutput("<h2>Acción desconocida: " + accion + "</h2>");
  }

  // Actualizar estado en la hoja
  // Ajusta los índices de columna según tu estructura de hoja
  hoja.getRange(filaIdx, CONFIG.COL_ESTADO).setValue(accionData.estado);
  hoja.getRange(filaIdx, CONFIG.COL_FECHA_ESTADO).setValue(new Date());
  if (obs) hoja.getRange(filaIdx, CONFIG.COL_OBSERVACIONES).setValue(obs);

  // Notificar al solicitante del cambio de estado
  const correo = datos[filaIdx - 1][CONFIG.COL_CORREO - 1];
  const nombre = datos[filaIdx - 1][CONFIG.COL_NOMBRE - 1];
  const titulo = datos[filaIdx - 1][CONFIG.COL_TITULO - 1];
  _correoActualizacionEstado(correo, nombre, titulo, accionData.estado, accionData.icono, obs);

  // Página de confirmación para el colaborador
  return HtmlService.createHtmlOutput(`
    <html><body style="font-family:Arial;padding:40px;text-align:center;max-width:500px;margin:0 auto;">
      <h2>${accionData.icono} ${accionData.estado}</h2>
      <p><strong>ID:</strong> ${id}</p>
      <p><strong>Registro:</strong> ${titulo}</p>
      ${obs ? `<p><strong>Observación:</strong> ${obs}</p>` : ""}
      <p style="color:#999;margin-top:30px;">Puedes cerrar esta ventana.</p>
    </body></html>`
  );
}

// ============================================================
//  _jsonResponse — Devuelve ContentService con JSON
// ============================================================
function _jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
