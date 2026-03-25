# Stock Service

Manages vehicle inventory at VIN level for Tata Motors dealership operations.

## Responsibilities
- VIN-level vehicle tracking from OEM dispatch to customer delivery
- Yard location management (bay/row/column system)
- Transit vehicle tracking with ETA
- Real-time stock availability (Redis cache, 30-second TTL)
- VIN allocation and locking for confirmed bookings
- Stock aging reports (vehicles by days-in-yard)
- Demo vehicle management (status: `demo_vehicle`)
- OEM allocation order management
- Multi-branch stock visibility (admin/manager role)
- Google Sheets data import during migration (existing akar-quotation-server stock data)

## Port: 3008

## Tech: NestJS + PostgreSQL + Redis (real-time availability cache)

## Stock Status Flow
```
in_transit → in_yard → blocked (reserved) → allocated (booked)
           → pdi_in_progress → pdi_done → delivered
```

## Key Tables
`vehicle_models`, `vehicle_variants`, `vehicle_colours`, `vehicles`, `accessories`

## Real-time Availability
Stock availability is cached in Redis with 30-second TTL:
```
Key: stock:availability:{variant_id}:{colour_id}:{branch_id}
Value: { count: 3, vins: [...] }
```

## Development
```bash
cd src/services/stock-service
npm install
npm run dev
```
