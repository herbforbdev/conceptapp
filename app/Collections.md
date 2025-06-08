### 💰 **Firestore Collection: Sales**

| **Field Name**     | **Description**                                                            |
| ------------------ | -------------------------------------------------------------------------- |
| `activityTypeId`   | 🔗 Link to **Activity Collection** → matches `name` or `id`                |
| `amountFC`         | Sales amount in local currency (**CDF**)                                   |
| `amountUSD`        | Sales amount converted to **USD**                                          |
| `channel`          | Sales channel (e.g., "Truck Delivery", "On-Site")                          |
| `date`             | Date of the sales transaction                                              |
| `exchangeRate`     | Exchange rate used for conversion (**CDF → USD**)                          |
| `modifiedAt`       | Timestamp of the last modification                                         |
| `productId`        | 🔗 Link to **Product Collection** → matches `productid` or `name`          |
| `quantitySold`     | Number of product units sold                                               |
| `activityTypeName` | Readable name of the related activity (from `name` in Activity Collection) |

---

### 🏭 **Firestore Collection: Production**

| **Field Name**      | **Description**                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| `activityTypeId`    | 🔗 Link to **Activity Collection** → field: `id`                                |
| `activityTypeName`  | Readable name of the related activity (from `name` in Activity Collection)      |
| `createdAt`         | Timestamp when the production entry was created                                 |
| `date`              | Production date (can differ from creation timestamp)                            |
| `packagingName`     | Name of the packaging used → should match `productid` in **Product Collection** |
| `packagingQuantity` | Quantity of packaging units used                                                |
| `packagingUsed`     | Internal or trace ID used for packaging batch                                   |
| `productName`       | Name of the final product → should match `productid` in **Product Collection**  |
| `productid`         | 🔗 Link to **Product Collection** → field: `id`                                 |
| `quantityProduced`  | Quantity of product produced                                                    |
| `updatedAt`         | Last modification timestamp                                                     |

---

### 📦 **Firestore Collection: Inventory**

| **Field Name**      | **Description**                                                                |
| ------------------- | ------------------------------------------------------------------------------ |
| `activityTypeId`    | 🔗 Link to **Activity Collection** → matches `name` or `id` depending on usage |
| `date`              | Date of the inventory movement                                                 |
| `initialQuantity`   | Quantity in stock before the movement                                          |
| `modifiedAt`        | Timestamp of the last modification                                             |
| `movementType`      | Type of movement (e.g., "In", "Out")                                           |
| `productId`         | 🔗 Link to **Product Collection** → should match `productid` or `name` field   |
| `quantityMoved`     | Quantity added to or removed from inventory                                    |
| `remainingQuantity` | Quantity in stock after the movement                                           |
| `activityTypeName`  | Readable name of the related activity (from `name` in Activity Collection)     |

---

### 💸 **Firestore Collection: Costs**

| **Field Name**     | **Description**                                                                    |
| ------------------ | ---------------------------------------------------------------------------------- |
| `activityTypeId`   | 🔗 Link to **Activity Collection** → matches `name` or `id`                        |
| `amountFC`         | Cost amount in local currency (**CDF**)                                            |
| `amountUSD`        | Cost amount converted to **USD**                                                   |
| `date`             | Date of the cost entry                                                             |
| `exchangeRate`     | Exchange rate used for conversion (**CDF → USD**)                                  |
| `expenseTypeId`    | 🔗 Link to **Expense Collection** → matches `name` or `id`                         |
| `modifiedAt`       | Timestamp of the last modification                                                 |
| `activityTypeName` | Readable name of the related activity (from `name` in Activity Collection)         |
| `expenseTypeName`  | 🔗 Link to **Expense Collection** → matches `name` - Readable name of expense type |
| `budget`           | % number to determine the budget of the expense type                               |

---
