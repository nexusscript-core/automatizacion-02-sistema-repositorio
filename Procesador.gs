// ============================================================
//  Procesador.gs
//  Función principal llamada por google.script.run desde el HTML.
//  Recibe el payload JSON, valida, organiza Drive, registra
//  en Sheets y dispara los correos.
// ============================================================

function procesarFormulario(payloadStr) {
  try {
    const data = JSON.parse(payloadStr);

    // ----------------------------------------------------------
    //  1. EXTRAE Y LIMPIA LOS CAMPOS DEL FORMULARIO
    //     Ajusta los nombres de campo según tu Formulario.html
    // ----------------------------------------------------------
    const campo1   = String(data.campo1   || "").trim();
    const campo2   = String(data.campo2   || "").trim();
    // const campoN = String(data.campoN  || "").trim();
    const archivos = data.archivos; // objeto con los PDFs en base64

    // ----------------------------------------------------------
    //  2. VALIDACIONES DE SERVIDOR
    //     Repite aquí las validaciones críticas del cliente
    // ----------------------------------------------------------
    if (!campo1) return { ok: false, error: "El campo1 es obligatorio." };
    // Ejemplo de validación de dominio institucional:
    // if (!campo1.endsWith(CONFIG.DOMINIO_INSTITUCIONAL)) {
    //   return { ok: false, error: "Correo no institucional." };
    // }

    // ----------------------------------------------------------
    //  3. GENERA ID ÚNICO
    // ----------------------------------------------------------
    const id = _generarID();

    // ----------------------------------------------------------
    //  4. CREA CARPETA EN DRIVE Y SUBE ARCHIVOS
    //     Ajusta los parámetros de _crearCarpetaEnDrive según
    //     la jerarquía que necesites (por sede, programa, año, etc.)
    // ----------------------------------------------------------
    const carpeta = _crearCarpetaEnDrive(
      /* nivel1 */ campo1,
      /* nivel2 */ campo2
      // Agrega más niveles si tu jerarquía lo requiere
    );

    // Comparte la carpeta con el solicitante (si tiene correo)
    try { carpeta.addViewer(data.correo); } catch(e) {
      Logger.log("⚠️ No se pudo compartir la carpeta: " + e.message);
    }
    const linkCarpeta = carpeta.getUrl();

    // Sube cada archivo desde base64
    const linkArchivo1 = _subirArchivoBase64(
      archivos.archivo1,
      carpeta,
      "NombreDescriptivo — " + campo1
    );
    // const linkArchivoN = _subirArchivoBase64(archivos.archivoN, carpeta, "Nombre");

    // ----------------------------------------------------------
    //  5. REGISTRA EN GOOGLE SHEETS
    //     Ajusta el orden de columnas según tu hoja de control
    // ----------------------------------------------------------
    const ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const hoja  = ss.getSheetByName(CONFIG.HOJA_CONTROL);

    hoja.appendRow([
      id,             // Columna A — ID único
      new Date(),     // Columna B — Fecha de recepción
      data.correo,    // Columna C — Correo solicitante
      campo1,         // Columna D — Tu campo 1
      campo2,         // Columna E — Tu campo 2
      // campoN,      // Columna F … — Más campos
      linkCarpeta,    // Penúltima — Link carpeta Drive
      linkArchivo1,   // Link archivo 1
      // linkArchivoN,
      ESTADOS.RECIBIDO, // Estado inicial
      new Date(),       // Fecha del estado
      "",               // Observaciones
    ]);

    // ----------------------------------------------------------
    //  6. CORREOS
    // ----------------------------------------------------------
    // Confirmación al solicitante
    _correoConfirmacionSolicitante(
      data.correo,
      campo1,         // nombre o identificador del solicitante
      campo2,         // título o referencia del registro
      linkCarpeta,
      id
    );

    // Notificación al responsable/colaborador
    const correoResponsable = _obtenerCorreoColaborador(ss, /* parámetros de enrutamiento */);
    _correoNotificacionColaborador(
      correoResponsable,
      campo1,
      campo2,
      linkCarpeta,
      id
    );

    Logger.log("✅ procesarFormulario OK — ID: " + id);
    return { ok: true, id: id, linkCarpeta: linkCarpeta };

  } catch (err) {
    Logger.log("❌ Error en procesarFormulario: " + err.message + "\n" + err.stack);
    _notificarErrorAdmin("procesarFormulario", err);
    return { ok: false, error: "Error interno: " + err.message };
  }
}
