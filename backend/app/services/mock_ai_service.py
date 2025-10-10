from app.models.plan_model import PlanResponse, PlanStep

async def generate_mock_plan(topic: str) -> PlanResponse:
    steps = [
        PlanStep(step=1, detail=f"Research tools and examples for {topic}."),
        PlanStep(step=2, detail="Set up repo structure and local env."),
        PlanStep(step=3, detail="Implement MVP features with tests."),
        PlanStep(step=4, detail="Polish UX and add error handling."),
        PlanStep(step=5, detail="Deploy, monitor, iterate.")
    ]
    return PlanResponse(
        title=f"Plan for {topic}",
        summary=f"A pragmatic roadmap to build and ship {topic}.",
        steps=steps
    )
