"use client";

import { DeliverySlot } from "@/features/delivery";
import { TrackingWorkbench, type WorkbenchProps } from "./workbench";

// Functions must be created on the client side of the Server Component boundary.
export function IntegratedWorkbench(props: Omit<WorkbenchProps, "renderDelivery">) {
  return <TrackingWorkbench {...props} renderDelivery={slot => <DeliverySlot {...slot} />} />;
}
