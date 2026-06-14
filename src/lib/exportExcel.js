import * as XLSX from 'xlsx'
import { formatArtistName, formatSaleTime } from './format'

// Flatten the nested sales of a set of items into chronological log entries.
// Each `sale` row is append-only; a negative quantity_sold is a correction.
// Exported for unit testing the log/netting logic.
export function collectSales(items, artistName) {
  const rows = []
  for (const item of items) {
    for (const sale of item.sales || []) {
      rows.push({
        soldAt: sale.sold_at,
        artist: artistName,
        item: item.name,
        qty: sale.quantity_sold,
        price: Number(item.price),
        notes: sale.notes || '',
        saleId: sale.id,
      })
    }
  }
  rows.sort((a, b) => new Date(a.soldAt) - new Date(b.soldAt))
  return rows
}

// Build an AOA (array-of-arrays) chronological log sheet from collected sales.
// Includes an Artist column only for the combined full log.
// Exported for unit testing the log/netting logic.
export function buildLogAoa(sales, { includeArtist }) {
  const header = ['Time']
  if (includeArtist) header.push('Artist')
  header.push('Item', 'Type', 'Qty', 'Unit Price', 'Line Total', 'Notes', 'Sale ID')

  const qtyIdx = header.indexOf('Qty')
  const totalIdx = header.indexOf('Line Total')

  const rows = [header]
  let netQty = 0
  let netTotal = 0

  for (const s of sales) {
    const lineTotal = s.qty * s.price
    netQty += s.qty
    netTotal += lineTotal
    const row = [formatSaleTime(s.soldAt)]
    if (includeArtist) row.push(s.artist)
    row.push(
      s.item,
      s.qty < 0 ? 'Correction' : 'Sale',
      s.qty,
      s.price,
      lineTotal,
      s.notes,
      s.saleId,
    )
    rows.push(row)
  }

  rows.push([])
  const totalRow = new Array(header.length).fill('')
  totalRow[0] = 'TOTAL'
  totalRow[qtyIdx] = netQty
  totalRow[totalIdx] = netTotal
  rows.push(totalRow)

  return rows
}

function logColWidths({ includeArtist }) {
  const cols = [{ wch: 16 }]                       // Time
  if (includeArtist) cols.push({ wch: 18 })        // Artist
  cols.push(
    { wch: 24 },  // Item
    { wch: 11 },  // Type
    { wch: 6 },   // Qty
    { wch: 10 },  // Unit Price
    { wch: 11 },  // Line Total
    { wch: 30 },  // Notes
    { wch: 38 },  // Sale ID
  )
  return cols
}

export function exportConventionReport(artists) {
  const wb = XLSX.utils.book_new()

  // --- Sheet 1: Summary ---
  const summaryRows = [
    ['Artist', 'Items', 'Total Brought', 'Total Sold', 'Remaining', 'Revenue'],
  ]

  let grandRevenue = 0
  let grandSold = 0

  for (const artist of artists) {
    const totalBrought = artist.items.reduce((s, i) => s + i.quantity_total, 0)
    const totalSold = artist.items.reduce(
      (s, i) => s + (i.quantity_total - i.quantity_remaining), 0
    )
    const remaining = artist.items.reduce((s, i) => s + i.quantity_remaining, 0)
    const revenue = artist.items.reduce((s, i) => {
      const sold = i.quantity_total - i.quantity_remaining
      return s + sold * Number(i.price)
    }, 0)

    grandRevenue += revenue
    grandSold += totalSold

    summaryRows.push([
      artist.display_name,
      artist.items.length,
      totalBrought,
      totalSold,
      remaining,
      revenue,
    ])
  }

  summaryRows.push([])
  summaryRows.push(['TOTAL', '', '', grandSold, '', grandRevenue])

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [
    { wch: 20 }, { wch: 8 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }
  ]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // --- Sheet 2: Full Log (every sale across all artists, chronological) ---
  const allSales = artists.flatMap(a =>
    collectSales(a.items, formatArtistName(a.display_name))
  )
  allSales.sort((a, b) => new Date(a.soldAt) - new Date(b.soldAt))
  const fullLogSheet = XLSX.utils.aoa_to_sheet(
    buildLogAoa(allSales, { includeArtist: true })
  )
  fullLogSheet['!cols'] = logColWidths({ includeArtist: true })
  XLSX.utils.book_append_sheet(wb, fullLogSheet, 'Full Log')

  // --- Sheet per artist: breakdown + that artist's chronological log ---
  for (const artist of artists) {
    const rows = [
      ['Item', 'Price', 'Brought', 'Sold', 'Remaining', 'Revenue'],
    ]

    for (const item of artist.items) {
      const sold = item.quantity_total - item.quantity_remaining
      rows.push([
        item.name,
        Number(item.price),
        item.quantity_total,
        sold,
        item.quantity_remaining,
        sold * Number(item.price),
      ])
    }

    rows.push([])
    const totalSold = artist.items.reduce(
      (s, i) => s + (i.quantity_total - i.quantity_remaining), 0
    )
    const totalRevenue = artist.items.reduce((s, i) => {
      const sold = i.quantity_total - i.quantity_remaining
      return s + sold * Number(i.price)
    }, 0)
    rows.push(['TOTAL', '', '', totalSold, '', totalRevenue])

    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = [
      { wch: 20 }, { wch: 8 }, { wch: 10 },
      { wch: 8 }, { wch: 12 }, { wch: 12 }
    ]

    // Append this artist's chronological log below the breakdown.
    const log = collectSales(artist.items)
    const logAoa = [[], ['Sales Log'], ...buildLogAoa(log, { includeArtist: false })]
    XLSX.utils.sheet_add_aoa(sheet, logAoa, { origin: -1 })

    // Sheet name max 31 chars, no special chars
    const sheetName = artist.display_name.slice(0, 31).replace(/[\\/*?:[\]]/g, '')
    XLSX.utils.book_append_sheet(wb, sheet, sheetName)
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `alley-report-${timestamp}.xlsx`)
}
