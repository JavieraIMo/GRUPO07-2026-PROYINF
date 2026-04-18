// scoringController.js
// Lógica de cálculo de scoring crediticio

function getThresholdsForAmount(monto) {
  if (monto <= 300000) {
    return { aprobado: 55, condicionado: 45 };
  }

  if (monto <= 3000000) {
    return { aprobado: 65, condicionado: 55 };
  }

  if (monto <= 10000000) {
    return { aprobado: 75, condicionado: 65 };
  }

  return { aprobado: 85, condicionado: 75 };
}

function buildScoringFeedback({
  breakdown,
  dicom,
  pensionAlimenticia,
  ingresos,
  historial,
  antiguedad,
  endeudamiento,
  scoringFinal,
  monto,
  estado,
  thresholds,
}) {
  const motivos = [];
  const recomendaciones = [];

  if (dicom) {
    motivos.push('Mantienes registros en DICOM, lo que reduce al minimo el criterio de comportamiento financiero.');
    recomendaciones.push('Regulariza o repacta las obligaciones informadas en DICOM antes de volver a evaluar tu solicitud.');
  }

  if (pensionAlimenticia) {
    motivos.push('Registras deuda o retencion por pension alimenticia, lo que afecta negativamente la evaluacion de riesgo.');
    recomendaciones.push('Regulariza la situacion de pension alimenticia y conserva respaldo del cumplimiento para una nueva evaluacion.');
  }

  if (breakdown.scoreIngresos < 15) {
    motivos.push(`Tus ingresos declarados (${ingresos}) no alcanzan un tramo fuerte para el monto solicitado.`);
    recomendaciones.push('Aumenta tus ingresos demostrables o reduce el monto solicitado para mejorar la relacion capacidad de pago/monto.');
  }

  if (historial === 'leve' || historial === 'atraso' || historial === 'malo') {
    motivos.push('Tu historial crediticio reciente muestra atrasos o morosidades que disminuyen la evaluacion.');
    recomendaciones.push('Mantiene pagos puntuales durante los proximos meses para mejorar tu historial antes de una nueva postulacion.');
  }

  if (breakdown.scoreAntiguedad < 7) {
    motivos.push(`La antiguedad laboral declarada (${antiguedad} anos) aporta menor estabilidad a la evaluacion.`);
    recomendaciones.push('Intenta postular con mayor continuidad laboral o adjuntando antecedentes que respalden estabilidad de ingresos.');
  }

  if (breakdown.scoreEndeudamiento < 4) {
    motivos.push(`Tu nivel de endeudamiento actual (${endeudamiento}%) es alto para este analisis.`);
    recomendaciones.push('Reduce carga financiera, consolida deudas o baja tus cuotas mensuales para mejorar tu perfil.');
  }

  const umbralObjetivo = estado === 'rechazado' ? thresholds.condicionado : thresholds.aprobado;
  const diferencia = umbralObjetivo - scoringFinal;

  if (diferencia > 0) {
    motivos.push(`Tu puntaje total fue ${scoringFinal}, por debajo del minimo requerido de ${umbralObjetivo} para este monto.`);
  }

  if (motivos.length === 0) {
    motivos.push('La evaluacion requiere reforzar antecedentes financieros para alcanzar una preaprobacion mas solida.');
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push('Vuelve a intentar con un monto menor o mejora tus antecedentes financieros antes de una nueva evaluacion.');
  }

  return {
    decision: estado === 'aprobado'
      ? 'La simulacion queda preaprobada y puede avanzar a postulacion.'
      : estado === 'condicionado'
        ? 'La simulacion requiere revision adicional antes de una postulacion formal.'
        : 'La simulacion se guarda en historial, pero no puede avanzar a postulacion porque no fue preaprobada.',
    motivos,
    recomendaciones,
    umbrales: {
      monto,
      minimoAprobado: thresholds.aprobado,
      minimoCondicionado: thresholds.condicionado,
    },
  };
}

exports.calcularScoring = (req, res) => {
  try {
    const {
      dicom, // boolean
      pensionAlimenticia, // boolean
      ingresos, // number
      historial, // string
      antiguedad, // number
      endeudamiento // number (porcentaje)
    } = req.body;
    // DEBUG: log para ver el valor recibido de endeudamiento
    console.log('[ALARA][scoring] Valor recibido de endeudamiento:', endeudamiento, typeof endeudamiento);
    // DEBUG: logs para ver los valores recibidos de dicom y pensionAlimenticia
    console.log('[ALARA][scoring] Valor recibido de dicom:', dicom, typeof dicom);
    console.log('[ALARA][scoring] Valor recibido de pensionAlimenticia:', pensionAlimenticia, typeof pensionAlimenticia);

    // Ponderaciones máximas:
    // DICOM: 30, Pensión: 15, Ingresos: 20, Historial: 20, Antigüedad: 10, Endeudamiento: 5
    // Total máximo: 100
    const breakdown = {}; // Declaración única de breakdown

    // DICOM
      
    breakdown.scoreDICOM = !dicom ? 30 : 0; // Asignación de scoreDICOM

    // Pensión alimenticia
    breakdown.scorePension = !pensionAlimenticia ? 15 : 0;

    // Ingresos
    if (ingresos >= 1500000) breakdown.scoreIngresos = 20;
    else if (ingresos >= 800000) breakdown.scoreIngresos = 15;
    else if (ingresos >= 400000) breakdown.scoreIngresos = 10;
    else breakdown.scoreIngresos = 5;

    // Historial crediticio (acepta códigos cortos y descripciones)
    if (
      historial === 'Sin morosidades / buen comportamiento' || historial === 'bueno'
    ) {
      breakdown.scoreHistorial = 20;
    } else if (
      historial === 'Morosidades leves' || historial === 'leve'
    ) {
      breakdown.scoreHistorial = 10;
    } else if (
      historial === 'Atrasos > 30 días pero sin deudas impagas' || historial === 'atraso'
    ) {
      breakdown.scoreHistorial = 5;
    } else if (
      historial === 'Mal historial (moroso frecuente)' || historial === 'malo'
    ) {
      breakdown.scoreHistorial = 0;
    } else {
      breakdown.scoreHistorial = 0;
    }

    // Antigüedad laboral
    if (antiguedad >= 5) breakdown.scoreAntiguedad = 10;
    else if (antiguedad >= 2) breakdown.scoreAntiguedad = 7;
    else if (antiguedad >= 1) breakdown.scoreAntiguedad = 4;
    else breakdown.scoreAntiguedad = 0;

    // Endeudamiento proporcional (menor % = mayor puntaje)
    if (endeudamiento < 20) breakdown.scoreEndeudamiento = 5;
    else if (endeudamiento < 40) breakdown.scoreEndeudamiento = 4;
    else if (endeudamiento < 60) breakdown.scoreEndeudamiento = 3;
    else if (endeudamiento < 80) breakdown.scoreEndeudamiento = 2;
    else if (endeudamiento <= 100) breakdown.scoreEndeudamiento = 1;
    else breakdown.scoreEndeudamiento = 0;

    // Score es la suma exacta de los valores de breakdown
    const scoringFinal = Object.values(breakdown).reduce((acc, val) => acc + val, 0);

    const monto = req.body.montoSolicitado || 0;
    const thresholds = getThresholdsForAmount(monto);
    let estado = "rechazado";

    if (scoringFinal >= thresholds.aprobado) estado = "aprobado";
    else if (scoringFinal >= thresholds.condicionado) estado = "condicionado";

    const feedback = buildScoringFeedback({
      breakdown,
      dicom,
      pensionAlimenticia,
      ingresos,
      historial,
      antiguedad,
      endeudamiento,
      scoringFinal,
      monto,
      estado,
      thresholds,
    });

    res.json({
      ok: true,
      scoring: scoringFinal,
      breakdown,
      estado,
      monto: monto,
      dicom,
      pensionAlimenticia,
      ingresos,
      historial,
      antiguedad,
      endeudamiento,
      decision: feedback.decision,
      motivos: feedback.motivos,
      recomendaciones: feedback.recomendaciones,
      umbrales: feedback.umbrales,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al calcular scoring.' });
  }
}

