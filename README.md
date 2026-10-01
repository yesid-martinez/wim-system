# Watch Inventory

A small inventory and pricing application for managing watches, their acquisition costs, and commercial prices.

## Core Domain

The system manages watches by **reference** rather than as individual physical units.

A watch reference identifies a specific model/style and can have multiple units in stock. Inventory is grouped into **inventory lots**, where each lot represents units of the same reference acquired together.

### Watch

A `Watch` represents a unique product reference.

* `id`
* `reference`
* `name`

Each reference is unique and can have multiple inventory lots.

### Inventory Lot

An `InventoryLot` represents a batch of watches acquired together.

Each lot contains:

* watch reference
* quantity
* purchase date
* total watch cost
* total shipping
* total fees

The cost per unit is calculated from the lot:

```text
unit cost =
(total watch cost + shipping + fees) / quantity
```

Different lots of the same watch reference may therefore have different unit costs.

## Inventory

Available quantity is calculated from the inventory lots belonging to a watch:

```text
available quantity =
SUM(inventory lot quantities)
```

The quantity is not stored separately on the watch.

## Pricing

Pricing is based on a target profit rather than a markup percentage.

The partner receives 15% of the profit, leaving 85% for the owner.

```text
price =
unit cost + (target profit / 0.85)
```

Current target-profit levels:

| Level       | Target Profit |
| ----------- | ------------: |
| Minimum     |    50,000 COP |
| Medium      |   100,000 COP |
| Recommended |   200,000 COP |

Commercial prices are rounded **up to the nearest 5,000 COP**.

For example:

```text
Unit cost:       200,000 COP
Target profit:   100,000 COP

Calculated price:
200,000 + (100,000 / 0.85)
= 317,647 COP

Commercial price:
320,000 COP
```

Prices are derived from the inventory lot's unit cost.

## Roles

The application has two roles:

### Admin

Administrators can manage inventory and access acquisition information, including:

* purchase dates
* watch costs
* shipping
* fees
* unit costs
* inventory lots
* commercial prices

### Marketing

Marketing users can access commercial inventory information, including:

* reference
* name
* available quantity
* sale prices

Marketing users must not have access to acquisition costs.

## Current Scope

The current MVP focuses on:

* managing watch references
* adding inventory through lots
* viewing available inventory
* calculating acquisition costs
* calculating commercial prices
* separating admin and marketing access

The following are intentionally outside the current MVP:

* sales
* customers
* orders
* suppliers
* stock movements
* sales history
* reports
* images
* multiple currencies
* complex role management

The application currently uses **COP** as its currency.

## Domain Principles

* A watch reference is a product model, not an individual physical watch.
* One reference can have multiple inventory lots.
* Inventory lots can have different acquisition costs.
* Shipping and fees belong to the corresponding inventory lot.
* Derived values should not be unnecessarily duplicated as editable data.
* Acquisition costs are sensitive information and must be protected from marketing users.
* The database is responsible for enforcing access restrictions.