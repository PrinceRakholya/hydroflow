# Security Specification - HydroFlow

## Data Invariants
1. Sensor readings must have numeric values within realistic ranges (temp: -50 to 100, moisture: 0-100).
2. `is_watering` and `is_auto_mode` must be booleans.
3. Timestamps must be valid strings or server timestamps.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Anon Write**: Create reading without auth.
2. **Schema Poison**: Reading with `temp` as a string.
3. **Malicious ID**: Document ID with 1MB string.
4. **State Skip**: Directly setting `is_watering` to `true` while `is_auto_mode` is active (if we want to restrict this).
5. **Timestamp Spoof**: Creating a reading with a 10-year future timestamp.
6. **Key Injection**: Adding `isAdmin: true` to a status document.
7. **Type Mismatch**: `soil_moisture` set to `[1, 2, 3]`.
8. **Resource Exhaustion**: Sending a reading with a 500KB description field (not in schema).
9. **Identity Spoof**: Setting `ownerId` to someone else (if applicable).
10. **Terminated State**: Updating an old sensor reading.
11. **Negative Moisture**: Setting moisture to `-10`.
12. **Blanket List**: Querying all sensors without any filter (if restricted).

## Test Runner Plan
We will use `firestore.rules.test.ts` to verify these constraints.
