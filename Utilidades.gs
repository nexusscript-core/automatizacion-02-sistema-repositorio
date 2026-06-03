// ============================================================
//  Utilidades.gs
//  Funciones auxiliares del sistema:
//  Drive, correos, triggers, setup, menú, ID único
// ============================================================

// ──────────────────────────────────────────────────────────────
//  ESTADOS DEL SISTEMA
//  Define aquí todos los estados posibles de una solicitud.
//  Se usan en Procesador.gs, Código.gs y los correos.
// ──────────────────────────────────────────────────────────────
const ESTADOS = {
  RECIBIDO:   "Recibido",
  EN_REVISION: "En revisión",
  INCOMPLETO: "Incompleto",
  APROBADO:   "Aprobado",
  FINALIZADO: "Finalizado",
  RECHAZADO:  "Rechazado"
  // Agrega o renombra según tu flujo
};

// ──────────────────────────────────────────────────────────────
//  DRIVE — Crear jerarquía de carpetas
//  Busca cada nivel y lo crea si no existe.
//  Agrega o elimina niveles según tu estructura.
// ──────────────────────────────────────────────────────────────
function _crearCarpetaEnDrive(nivel1, nivel2 /*, nivel3, ... */) {
  const raiz    = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_FOLDER_ID);
  const cNivel1 = _buscarOCrear(raiz,    nivel1);
  const cNivel2 = _buscarOCrear(cNivel1, nivel2);
  // const cNivel3 = _buscarOCrear(cNivel2, nivel3);
  return cNivel2; // retorna el nivel más profundo
}

function _buscarOCrear(padre, nombre) {
  const iter = padre.getFoldersByName(nombre);
  return iter.hasNext() ? iter.next() : padre.createFolder(nombre);
}

// ──────────────────────────────────────────────────────────────
//  DRIVE — Subir archivo desde base64
// ──────────────────────────────────────────────────────────────
function _subirArchivoBase64(archivoData, carpetaDestino, nombreBase) {
  try {
    if (!archivoData || !archivoData.datos) return "";
    const extension = (archivoData.nombre || "").split(".").pop() || "pdf";
    const blob = Utilities.newBlob(
      Utilities.base64Decode(archivoData.datos),
      archivoData.tipo || "application/pdf",
      nombreBase + "." + extension
    );
    const archivo = carpetaDestino.createFile(blob);
    Logger.log("✅ Archivo subido: " + archivo.getName());
    return archivo.getUrl();
  } catch (err) {
    Logger.log("⚠️ Error subiendo archivo: " + err.message);
    return "";
  }
}

// ──────────────────────────────────────────────────────────────
//  DRIVE — Mover carpeta a subfolder de "terminados"
//  Útil cuando una solicitud alcanza el estado final.
// ──────────────────────────────────────────────────────────────
function _moverCarpetaATerminados(linkCarpeta) {
  try {
    const id = _extraerIdDriveLink(linkCarpeta);
    if (!id) return;
    const carpeta      = DriveApp.getFolderById(id);
    const padre        = carpeta.getParents().next();
    const terminados   = _buscarOCrear(padre, CONFIG.NOMBRE_CARPETA_TERMINADOS);
    carpeta.moveTo(terminados);
    Logger.log("📁 Carpeta movida a terminados: " + carpeta.getName());
  } catch (err) {
    Logger.log("⚠️ No se pudo mover la carpeta: " + err.message);
  }
}

function _extraerIdDriveLink(link) {
  if (!link) return null;
  const patrones = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /open\?id=([a-zA-Z0-9_-]+)/
  ];
  for (const p of patrones) {
    const m = link.match(p);
    if (m) return m[1];
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
//  COLABORADORES — Enrutamiento de notificaciones
//  Devuelve el correo del responsable según los parámetros
//  de enrutamiento (sede, facultad, categoría, etc.)
//  Lógica en cascada: match exacto → fallback → admin
// ──────────────────────────────────────────────────────────────
function _obtenerCorreoColaborador(ss /*, parametro1, parametro2 */) {
  const hoja  = ss.getSheetByName(CONFIG.HOJA_COLABORADORES);
  const datos = hoja.getDataRange().getValues();

  // Paso 1 — Match exacto (ajusta los índices de columna)
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][CONFIG.COL_COLAB_ACTIVO] !== "SÍ") continue;
    // if (datos[i][0] === parametro1 && datos[i][1] === parametro2) {
    //   return datos[i][CONFIG.COL_COLAB_CORREO];
    // }
  }

  // Paso 2 — Fallback: cualquier colaborador activo
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][CONFIG.COL_COLAB_ACTIVO] === "SÍ") {
      return datos[i][CONFIG.COL_COLAB_CORREO];
    }
  }

  // Paso 3 — Último recurso: admin
  return CONFIG.CORREO_ADMIN;
}

// ──────────────────────────────────────────────────────────────
//  CORREOS — Confirmación al solicitante
//  Personaliza el HTML según tu sistema.
// ──────────────────────────────────────────────────────────────
function _correoConfirmacionSolicitante(correo, nombre, titulo, linkCarpeta, id) {
  const asunto = `[${CONFIG.PREFIJO_SISTEMA}] Solicitud recibida — ${titulo}`;
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">

  <!-- ENCABEZADO — personaliza colores y nombre del sistema -->
  <div style="background:TU_COLOR_PRIMARIO;padding:28px 32px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;">NOMBRE DE TU SISTEMA</h2>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Tu institución</p>
  </div>

  <div style="background:#fff;border:1px solid #dde1e7;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
    <p>Hola <strong>${nombre}</strong>,</p>
    <p style="color:#555;line-height:1.6;">Tu solicitud fue recibida exitosamente.</p>

    <!-- TABLA DE RESUMEN -->
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
      <tr>
        <td style="padding:10px 14px;background:#f5f5f7;font-weight:700;border:1px solid #dde1e7;width:38%;">ID Solicitud</td>
        <td style="padding:10px 14px;border:1px solid #dde1e7;font-weight:700;">${id}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#f5f5f7;font-weight:700;border:1px solid #dde1e7;">Referencia</td>
        <td style="padding:10px 14px;border:1px solid #dde1e7;">${titulo}</td>
      </tr>
      <!-- Agrega más filas según los campos de tu sistema -->
    </table>

    <!-- BOTÓN DE ACCIÓN (si aplica) -->
    <div style="text-align:center;margin:24px 0;">
      <a href="${linkCarpeta}"
         style="background:TU_COLOR_PRIMARIO;color:#fff;padding:13px 36px;
                text-decoration:none;border-radius:6px;font-weight:700;
                display:inline-block;font-size:14px;">
        Ver mis archivos
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #dde1e7;margin:24px 0 12px;">
    <p style="color:#bbb;font-size:11px;text-align:center;">
      ${CONFIG.NOMBRE_INSTITUCION}
    </p>
  </div>
</body>
</html>`;
  GmailApp.sendEmail(correo, asunto, "", { htmlBody: html, name: CONFIG.NOMBRE_SISTEMA });
}

// ──────────────────────────────────────────────────────────────
//  CORREOS — Notificación al colaborador/responsable
//  Incluye botones de acción que apuntan a doGet con parámetros.
// ──────────────────────────────────────────────────────────────
function _correoNotificacionColaborador(correoColab, nombre, titulo, linkCarpeta, id) {
  const webAppUrl     = ScriptApp.getService().getUrl();

  // Genera las URLs de acción — ajusta los nombres según tus acciones
  const urlAprobar    = `${webAppUrl}?accion=aprobar&id=${id}`;
  const urlIncompleto = `${webAppUrl}?accion=incompleto&id=${id}`;
  const urlRechazar   = `${webAppUrl}?accion=rechazar&id=${id}`;

  const asunto = `[${CONFIG.PREFIJO_SISTEMA}] Nueva solicitud — ${nombre}`;
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">

  <div style="background:TU_COLOR_PRIMARIO;padding:28px 32px;border-radius:8px 8px 0 0;">
    <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:0 0 6px;letter-spacing:2px;text-transform:uppercase;">Nueva solicitud</p>
    <h2 style="color:#fff;margin:0;">NOMBRE DE TU SISTEMA</h2>
  </div>

  <div style="background:#fff;border:1px solid #dde1e7;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
    <p>Hay una nueva solicitud lista para revisar:</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
      <tr>
        <td style="padding:10px 14px;background:#f5f5f7;font-weight:700;border:1px solid #dde1e7;width:38%;">ID</td>
        <td style="padding:10px 14px;border:1px solid #dde1e7;font-weight:700;">${id}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#f5f5f7;font-weight:700;border:1px solid #dde1e7;">Solicitante</td>
        <td style="padding:10px 14px;border:1px solid #dde1e7;">${nombre}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#f5f5f7;font-weight:700;border:1px solid #dde1e7;">Referencia</td>
        <td style="padding:10px 14px;border:1px solid #dde1e7;">${titulo}</td>
      </tr>
      <!-- Agrega más filas según los campos de tu sistema -->
    </table>

    <!-- ENLACE A DRIVE -->
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${linkCarpeta}"
         style="background:#2e86c1;color:#fff;padding:11px 28px;
                text-decoration:none;border-radius:6px;font-weight:700;
                display:inline-block;font-size:13px;">
        Ver archivos en Drive
      </a>
    </div>

    <!-- BOTONES DE ACCIÓN -->
    <p style="text-align:center;font-weight:700;font-size:12px;color:#777;
              text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">
      Tomar acción
    </p>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:4px;">
          <a href="${urlAprobar}"
             style="background:#27ae60;color:#fff;padding:12px 0;
                    text-decoration:none;border-radius:6px;font-weight:700;
                    display:block;text-align:center;font-size:13px;">
            APROBAR
          </a>
        </td>
        <td style="padding:4px;">
          <a href="${urlIncompleto}"
             style="background:#e67e22;color:#fff;padding:12px 0;
                    text-decoration:none;border-radius:6px;font-weight:700;
                    display:block;text-align:center;font-size:13px;">
            INCOMPLETO
          </a>
        </td>
        <td style="padding:4px;">
          <a href="${urlRechazar}"
             style="background:#e74c3c;color:#fff;padding:12px 0;
                    text-decoration:none;border-radius:6px;font-weight:700;
                    display:block;text-align:center;font-size:13px;">
            RECHAZAR
          </a>
        </td>
      </tr>
    </table>
    <!-- Agrega más botones de acción según tu flujo -->

    <hr style="border:none;border-top:1px solid #dde1e7;margin:24px 0 12px;">
    <p style="color:#bbb;font-size:11px;text-align:center;">
      ${CONFIG.NOMBRE_INSTITUCION}
    </p>
  </div>
</body>
</html>`;
  GmailApp.sendEmail(correoColab, asunto, "", { htmlBody: html });
}

// ──────────────────────────────────────────────────────────────
//  CORREOS — Actualización de estado al solicitante
// ──────────────────────────────────────────────────────────────
function _correoActualizacionEstado(correo, nombre, titulo, estado, icono, obs) {
  const asunto = `[${CONFIG.PREFIJO_SISTEMA}] Actualización — ${titulo}`;

  // Mapa visual de estados: ajusta colores y etiquetas
  const colores = {
    [ESTADOS.APROBADO]:   { bg: "#eef7e6", borde: "#27ae60", texto: "#27ae60", etiqueta: "APROBADO" },
    [ESTADOS.INCOMPLETO]: { bg: "#fff8e6", borde: "#e67e22", texto: "#e67e22", etiqueta: "DOCUMENTACIÓN INCOMPLETA" },
    [ESTADOS.RECHAZADO]:  { bg: "#fdecea", borde: "#e74c3c", texto: "#e74c3c", etiqueta: "RECHAZADO" },
    [ESTADOS.FINALIZADO]: { bg: "#eef7e6", borde: "#27ae60", texto: "#27ae60", etiqueta: "FINALIZADO" }
  };
  const c = colores[estado] || { bg: "#f5f5f5", borde: "#aaa", texto: "#555", etiqueta: estado };

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">

  <div style="background:TU_COLOR_PRIMARIO;padding:28px 32px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;">NOMBRE DE TU SISTEMA</h2>
  </div>

  <div style="background:#fff;border:1px solid #dde1e7;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
    <p>Hola <strong>${nombre}</strong>,</p>
    <p style="color:#555;">Tu solicitud <strong>"${titulo}"</strong> tiene una actualización:</p>

    <!-- ESTADO DESTACADO -->
    <div style="background:${c.bg};border:2px solid ${c.borde};border-radius:8px;
                padding:22px;text-align:center;margin:20px 0;">
      <p style="margin:0;font-size:17px;font-weight:800;color:${c.texto};letter-spacing:1px;">
        ${icono} ${c.etiqueta}
      </p>
    </div>

    <!-- OBSERVACIÓN (si existe) -->
    ${obs ? `
    <div style="background:#f9f9f9;border-left:4px solid ${c.borde};padding:14px 18px;
                border-radius:0 6px 6px 0;margin-bottom:20px;">
      <p style="margin:0;font-weight:700;font-size:13px;color:${c.texto};">Observación</p>
      <p style="margin:8px 0 0;font-size:13px;color:#555;line-height:1.6;">${obs}</p>
    </div>` : ""}

    <hr style="border:none;border-top:1px solid #dde1e7;margin:24px 0 12px;">
    <p style="color:#bbb;font-size:11px;text-align:center;">
      ${CONFIG.NOMBRE_INSTITUCION}
    </p>
  </div>
</body>
</html>`;
  GmailApp.sendEmail(correo, asunto, "", { htmlBody: html });
}

// ──────────────────────────────────────────────────────────────
//  ALERTAS DE ERROR AL ADMIN
// ──────────────────────────────────────────────────────────────
function _notificarErrorAdmin(contexto, err) {
  try {
    GmailApp.sendEmail(
      CONFIG.CORREO_ADMIN,
      `[${CONFIG.PREFIJO_SISTEMA}] ❌ Error en ${contexto}`,
      `Error: ${err.message}\n\nStack:\n${err.stack}`
    );
  } catch(e) { Logger.log("No se pudo notificar error al admin."); }
}

// ──────────────────────────────────────────────────────────────
//  TRIGGER DIARIO — Revisión de solicitudes sin atender
//  Instálalo con ScriptApp desde setupInicial()
// ──────────────────────────────────────────────────────────────
function revisionDiaria() {
  const ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const hoja  = ss.getSheetByName(CONFIG.HOJA_CONTROL);
  const datos = hoja.getDataRange().getValues();
  const ahora = new Date();

  for (let i = 1; i < datos.length; i++) {
    const estado      = datos[i][CONFIG.COL_ESTADO - 1];
    const fechaEstado = new Date(datos[i][CONFIG.COL_FECHA_ESTADO - 1]);
    const dias        = Math.floor((ahora - fechaEstado) / (1000 * 60 * 60 * 24));
    const id          = datos[i][0];
    const titulo      = datos[i][CONFIG.COL_TITULO - 1];

    // Alerta si lleva más de N días sin moverse
    if (estado === ESTADOS.RECIBIDO && dias >= CONFIG.DIAS_ALERTA_COLABORADOR) {
      const correoColab = _obtenerCorreoColaborador(ss);
      GmailApp.sendEmail(
        correoColab,
        `[${CONFIG.PREFIJO_SISTEMA}] Solicitud sin revisar — ${dias} días — ${titulo}`,
        `La solicitud ID ${id} lleva ${dias} días en estado "${estado}". Por favor toma acción.`
      );
    }
  }
}

// ──────────────────────────────────────────────────────────────
//  SETUP INICIAL — Ejecutar una sola vez
// ──────────────────────────────────────────────────────────────
function setupInicial() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  _crearHojaControl(ss);
  _crearHojaColaboradores(ss);
  _instalarTriggers();
  SpreadsheetApp.getUi().alert("✅ Setup completado.");
}

function _crearHojaControl(ss) {
  let hoja = ss.getSheetByName(CONFIG.HOJA_CONTROL);
  if (!hoja) hoja = ss.insertSheet(CONFIG.HOJA_CONTROL);

  // Ajusta los encabezados según los campos de tu sistema
  const encabezados = [
    "ID", "Fecha", "Correo",
    "Campo 1", "Campo 2",   // reemplaza con tus campos
    "Link Carpeta Drive", "Link Archivo 1",
    "Estado", "Fecha Estado", "Observaciones"
  ];

  if (hoja.getRange(1, 1).getValue() !== "ID") {
    hoja.getRange(1, 1, 1, encabezados.length)
      .setValues([encabezados])
      .setBackground("TU_COLOR_PRIMARIO")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    hoja.setFrozenRows(1);
  }
}

function _crearHojaColaboradores(ss) {
  let hoja = ss.getSheetByName(CONFIG.HOJA_COLABORADORES);
  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.HOJA_COLABORADORES);
    // Encabezados — ajusta las columnas según tus criterios de enrutamiento
    hoja.getRange(1, 1, 1, 5).setValues([[
      "Criterio1", "Criterio2", "Correo", "Cargo", "Activo"
    ]]).setBackground("TU_COLOR_PRIMARIO").setFontColor("#ffffff").setFontWeight("bold");

    // Agrega aquí los colaboradores iniciales
    // hoja.getRange(2, 1, 1, 5).setValues([[
    //   "ValorCriterio1", "ValorCriterio2", "colaborador@institucion.edu.co", "Cargo", "SÍ"
    // ]]);
  }
}

function _instalarTriggers() {
  // Elimina triggers anteriores para evitar duplicados
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Trigger diario a las 8:00 a.m.
  ScriptApp.newTrigger("revisionDiaria")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
}

// ──────────────────────────────────────────────────────────────
//  MENÚ EN SPREADSHEET
// ──────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(CONFIG.PREFIJO_SISTEMA)
    .addItem("Setup Inicial", "setupInicial")
    .addSeparator()
    .addItem("Ver solicitudes activas", "verActivas")
    .addToUi();
}

function verActivas() {
  const ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const hoja  = ss.getSheetByName(CONFIG.HOJA_CONTROL);
  const datos = hoja.getDataRange().getValues();

  const estadosActivos = [ESTADOS.RECIBIDO, ESTADOS.EN_REVISION, ESTADOS.INCOMPLETO];
  let lista = "";
  for (let i = 1; i < datos.length; i++) {
    if (estadosActivos.includes(datos[i][CONFIG.COL_ESTADO - 1])) {
      lista += `\n- [${datos[i][0]}] ${datos[i][CONFIG.COL_TITULO - 1]} — ${datos[i][CONFIG.COL_ESTADO - 1]}`;
    }
  }
  SpreadsheetApp.getUi().alert("Solicitudes activas:" + (lista || "\nNinguna."));
}

// ──────────────────────────────────────────────────────────────
//  ID ÚNICO
//  Formato: PREFIJO-YYYYMMDD-XXXXX (aleatorio en mayúsculas)
// ──────────────────────────────────────────────────────────────
function _generarID() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const fecha = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `${CONFIG.PREFIJO_SISTEMA}-${fecha}-${random}`;
}
