let account;
const header = ['Acct Type', 'Sub Type', 'Account', 'Sub Account', 'Qtr', 'Date', 'Ref', 'Type', 'Amount', 'Description', 'Note'];

async function upload(event) {
  const file = event.target.files[0];
  const text = await file.text();
  const content = convertFile(text);
  const link = document.getElementById('download-link');
  const blob = new Blob([content], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  link.href = url;
  link.download = "GL.csv";
  link.classList.remove('hidden');
}

function convertFile(text) {
  account = [];
  const lines = text.split(/\r\n/);
  const rows = lines.map(processLine).filter(row => row);
  const content = [header, ...rows].map(csvRow).join('');
  return content;
}

function processLine(line) {
  const trx = parseTrx(line);
  return trx ? trxRow(trx) : parseAccount(line);
}

const lineFormat = [
  ['note', 9, 28],  
  ['type', 30, 32],
  ['ref', 35, 46],
  ['desc', 49, 68],
  ['date', 70, 79],
  ['debitAmt', 81, 95],
  ['creditAmt', 97, 111],
];

function parseTrx(line) {
  const trx = {};
  for (const [field, start, end] of lineFormat) {
    trx[field] = line.substring(start-1, end).trim();
    if (field.match(/Amt$/)) trx[field] = trx[field].replace(/,/g, '');
  }
  [trx.year, trx.qtr] = dateYearQtr(trx.date);
  if (! trx.year) return;
  trx.amt = trx.debitAmt || ('-' + trx.creditAmt);
  if (trx.note === trx.desc) trx.note = '';
  return trx;
}

function dateYearQtr(date) {
  const matches = date.match(/^(\d\d)\/\d\d\/(\d\d\d\d)$/);
  return matches ? [matches[2], 'Q' + Math.ceil(+matches[1]/3)] : [];
}

function parseAccount(line) {
  line = line.replace(/ +/, ' ');
  const lineWithoutBegBal = line.replace(/Beginning Balance.*/, '');
  const trimmed = lineWithoutBegBal.trim();
  if (line.match(/^\d{5}/)) account = [trimmed, trimmed];
  else if (line !== lineWithoutBegBal) {
    account[1] = trimmed;
    return beginningBalance(line);
  }
}

function beginningBalance(line) {
  let [,amt] = line.match(/Beginning Balance\s+([0-9-.,]+)/);
  amt = amt.replace(/,/g, '');
  return amt !== '0.00' && trxRow({ qtr: 'Beg', amt, desc: 'Beginning Balance' });
}

const acctTypeOf = {
  1: 'Assets',
  2: 'Liabilities',
  3: 'Reserves',
  4: 'Income',
  5: 'Expenses',
    50: 'Admin',
    51: 'Admin',
    52: 'Payroll',
    53: 'Utilities',
    54: 'Operating',
    55: 'Operating',
    56: 'Operating',
    57: 'Contracted',
    58: 'Taxes',
    59: 'Amenities',
  6: 'Contributions',
};

function trxRow (trx) {
  const [acct, subAcct] = account;
  const acctType = acctTypeOf[acct[0]];
  const acctSubType = acctTypeOf[acct.substr(0,2)] || '';
  const row = [acctType, acctSubType, acct, subAcct, trx.qtr, trx.date, trx.ref, trx.type, trx.amt, trx.desc, trx.note];
  return row;
}

function csvRow(row) {
  return row.map(csvCell).join(',') + '\n';
}

function csvCell(cell) {
  cell = (cell ?? '').toString();
  if (cell.match(/[",\n]/)) cell = '"' + cell.replace(/"/g, '""') + '"';
  return cell;
}
