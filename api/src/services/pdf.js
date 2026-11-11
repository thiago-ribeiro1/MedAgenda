const PDFDocument = require("pdfkit");
const { NOME_CLINICA } = require("../config");

const AZUL = "#0F5F73";
const CINZA = "#5B6878";

function novoPdf(res, nomeArquivo, titulo) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: titulo, Author: NOME_CLINICA } });
  doc.pipe(res);
  doc.rect(0, 0, doc.page.width, 70).fill(AZUL);
  doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold").text(NOME_CLINICA, 50, 26);
  doc.fontSize(9).font("Helvetica").text("Rua das Acácias, 120 · Centro · (83) 3333-0000", 50, 48);
  doc.fillColor("#1D2733").moveDown(3);
  doc.y = 100;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(AZUL).text(titulo, 50);
  doc.moveDown(0.6).fillColor("#1D2733").font("Helvetica").fontSize(11);
  return doc;
}

function campo(doc, rotulo, valor) {
  doc.font("Helvetica-Bold").text(`${rotulo}: `, { continued: true }).font("Helvetica").text(valor || "—");
}

function rodape(doc, texto) {
  doc.fontSize(8).fillColor(CINZA).text(texto, 50, doc.page.height - 60, { width: doc.page.width - 100, align: "center" });
}

function assinatura(doc, medico) {
  doc.moveDown(4);
  const x = 180;
  doc.moveTo(x, doc.y).lineTo(x + 240, doc.y).strokeColor("#999999").stroke();
  doc.moveDown(0.3).fontSize(10).fillColor("#1D2733").text(medico.nome, x, doc.y, { width: 240, align: "center" });
  doc.fontSize(9).fillColor(CINZA).text(`${medico.crm} · ${medico.especialidade}`, x, doc.y, { width: 240, align: "center" });
}

function tabela(doc, cabecalho, linhas, larguras) {
  const x0 = 50;
  let y = doc.y + 6;
  const desenharLinha = (valores, negrito, fundo) => {
    const altura = Math.max(...valores.map((v, i) => doc.heightOfString(String(v), { width: larguras[i] - 8 }))) + 8;
    if (y + altura > doc.page.height - 80) { doc.addPage(); y = 60; }
    if (fundo) doc.rect(x0, y, larguras.reduce((a, b) => a + b, 0), altura).fill(fundo);
    let x = x0;
    doc.font(negrito ? "Helvetica-Bold" : "Helvetica").fillColor(negrito ? "#FFFFFF" : "#1D2733");
    valores.forEach((v, i) => { doc.text(String(v), x + 4, y + 4, { width: larguras[i] - 8 }); x += larguras[i]; });
    y += altura;
  };
  doc.fontSize(9);
  desenharLinha(cabecalho, true, AZUL);
  linhas.forEach((l, i) => desenharLinha(l, false, i % 2 ? "#EEF4F6" : null));
  doc.y = y + 10;
  doc.x = x0;
}

module.exports = { novoPdf, campo, rodape, assinatura, tabela, AZUL, CINZA };
