function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('settings') || ss.insertSheet('settings');
  const alcoholSheet = ss.getSheetByName('alcohol') || ss.insertSheet('alcohol');
  const weightSheet = ss.getSheetByName('weight') || ss.insertSheet('weight');
  const bloodSheet = ss.getSheetByName('blood') || ss.insertSheet('blood');

  // Load Settings
  const settingsData = settingsSheet.getDataRange().getValues();
  let settings = { name: 'ゲスト', dailyGoalDrinks: 2 };
  if (settingsData.length > 1) {
    settings = {
      name: settingsData[1][0],
      dailyGoalDrinks: Number(settingsData[1][1])
    };
  }

  // Load Alcohol Records
  const alcoholData = alcoholSheet.getDataRange().getValues();
  const alcoholRecords = alcoholData.slice(1).map(row => ({
    id: row[0],
    date: row[1],
    name: row[2],
    volume: Number(row[3]),
    abv: Number(row[4]),
    price: Number(row[5]),
    drinks: Number(row[6])
  }));

  // Load Weight Records
  const weightData = weightSheet.getDataRange().getValues();
  const weightRecords = weightData.slice(1).map(row => ({
    id: row[0],
    date: row[1],
    weight: Number(row[2])
  }));

  // Load Blood Records
  const bloodData = bloodSheet.getDataRange().getValues();
  const bloodTestRecords = bloodData.slice(1).map(row => ({
    id: row[0],
    date: row[1],
    gammaGTP: Number(row[2]),
    ast: Number(row[3]),
    alt: Number(row[4]),
    triglycerides: Number(row[5])
  }));

  const response = {
    settings,
    alcoholRecords,
    weightRecords,
    bloodTestRecords
  };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const type = data.type;
  const action = data.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'delete') {
    const sheet = ss.getSheetByName(type);
    if (!sheet) return createResponse({ success: false, message: 'Sheet not found' });
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        return createResponse({ success: true });
      }
    }
    return createResponse({ success: false, message: 'ID not found' });
  }

  if (type === 'settings') {
    const sheet = ss.getSheetByName('settings') || ss.insertSheet('settings');
    sheet.clear();
    sheet.appendRow(['name', 'dailyGoalDrinks']);
    sheet.appendRow([data.name, data.dailyGoalDrinks]);
  } else if (type === 'alcohol') {
    const sheet = ss.getSheetByName('alcohol') || ss.insertSheet('alcohol');
    if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'date', 'name', 'volume', 'abv', 'price', 'drinks']);
    sheet.appendRow([data.id, data.date, data.name, data.volume, data.abv, data.price, data.drinks]);
  } else if (type === 'weight') {
    const sheet = ss.getSheetByName('weight') || ss.insertSheet('weight');
    if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'date', 'weight']);
    sheet.appendRow([data.id, data.date, data.weight]);
  } else if (type === 'blood') {
    const sheet = ss.getSheetByName('blood') || ss.insertSheet('blood');
    if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'date', 'gammaGTP', 'ast', 'alt', 'triglycerides']);
    sheet.appendRow([data.id, data.date, data.gammaGTP, data.ast, data.alt, data.triglycerides]);
  }

  return createResponse({ success: true });
}

function createResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
