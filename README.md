# Pager Service - Domain Logic Implementation

This repository contains the domain logic for an alert pager service, as part of the Saleslights coding exercise.

## Architecture

The solution is implemented following the principles of **Hexagonal Architecture (Ports and Adapters)**.

-   **/src/domain**: Contains the core business logic and models (`PagerService`, `MonitoredService`, etc.). This is the "hexagon" and it has no knowledge of outside technologies like databases or email services.
-   **/src/ports**: Defines the interfaces (the "ports") that the domain logic uses to communicate with the outside world. These are contracts for sending notifications, persisting state, setting timers, and fetching policies.
-   **Adapters (Not Implemented)**: The adapters would be concrete implementations of the ports. For example, a `SendGridAdapter` would implement the `NotificationPort` and a `PostgresAdapter` would implement the `PersistencePort`. These are kept separate from the core logic.

This separation of concerns makes the core domain logic highly testable, maintainable, and independent of specific technologies.

### Concurrency Guarantees

The exercise notes that the Pager Service should not send a second notification if an alert is already active. This implementation handles that by checking the service's state before processing a new alert.

In a real-world, distributed system, this would require a guarantee from the database (the `PersistencePort` adapter). To prevent race conditions where two alerts are processed simultaneously, the `getServiceState` and `saveServiceState` operations would need to be atomic. This could be achieved using:

1.  **Database Transactions** with a `SELECT ... FOR UPDATE` lock to ensure only one process can read and then write the state of a specific service at a time.
2.  **Optimistic Locking** where a version number is stored with the service state. The `saveServiceState` operation would fail if the version number has changed since it was read, prompting a retry.

## How to Run Tests

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the unit tests:
    ```bash
    npm test
    ```

You should see all tests passing, which validates the logic against the use cases provided in the exercise description.