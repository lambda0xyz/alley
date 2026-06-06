import * as XLSX from 'xlsx'

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

  // --- Sheet per artist ---
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

    // Sheet name max 31 chars, no special chars
    const sheetName = artist.display_name.slice(0, 31).replace(/[\\/*?:[\]]/g, '')
    XLSX.utils.book_append_sheet(wb, sheet, sheetName)
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `alley-report-${timestamp}.xlsx`)
}