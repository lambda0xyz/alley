// Quantity badge for a single sale row. A negative quantity is a correction
// (stock added back) and renders as "−n" with the correction style; a positive
// quantity is a normal sale and renders as "×n".
export default function SaleQty({ quantity }) {
  const correction = quantity < 0
  return (
    <span className={`sale-qty ${correction ? 'sale-qty-correction' : ''}`}>
      {correction ? `−${Math.abs(quantity)}` : `×${quantity}`}
    </span>
  )
}
