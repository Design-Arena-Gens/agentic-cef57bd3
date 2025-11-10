import { NextRequest, NextResponse } from "next/server";
import { planDay, TaskInput, EventInput, SettingsInput } from "@lib/planner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tasks = (body.tasks ?? []) as TaskInput[];
    const events = (body.events ?? []) as EventInput[];
    const settings = body.settings as SettingsInput;

    if (!settings || !settings.date || !settings.dayStart || !settings.dayEnd) {
      return NextResponse.json({ error: "Brak wymaganych ustawie?" }, { status: 400 });
    }

    const plan = planDay(tasks, events, settings);
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json({ error: "Nieprawid?owe dane" }, { status: 400 });
  }
}
