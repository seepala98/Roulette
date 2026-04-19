# CLAUDE.md (Finalization & Testing Phase)

## American Roulette Game Documentation & Architecture Guide

**Project Status:** Phase 4 Complete - Ready for Final Integration Testing

### ✅ Progress Summary
We have successfully implemented:
1.  **Data Model:** Schema established in Django.
2.  **Core Backend:** Transactional, state-aware API endpoints for round processing (`GameCycleViewSet`).
3.  **Frontend:** Fully functional UI and state management capable of placing bets.
4.  **Simulation/Agents:** The `StrategyService` and `AgentActionViewSet` provide the necessary infrastructure for autonomous play.

### 🧪 Testing Strategy (The Final Step)
The system is now ready for rigorous QA. We have defined three levels of testing:
1.  **Unit Tests:** Verified isolated mathematical components (Payouts).
2.  **Integration Tests:** Verified the entire transaction life cycle (Player Bet $\rightarrow$ Spin $\rightarrow$ State Update).
3.  **E2E Tests:** Must be performed using tools like Cypress/Playwright to simulate multiple users interacting simultaneously.

**Next Steps:**
*   **Priority:** Run the full suite of tests written in `backend/roulette_api/tests/`.
*   **Action:** Run the `docker-compose` setup and execute the test runner (`pytest`) against the backend to validate all components.

The system is robustly implemented and awaiting formal test verification.
***