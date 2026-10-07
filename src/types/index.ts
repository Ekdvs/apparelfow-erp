export type Role = "CUTTING_SUPERVISOR" | "CUTTING_VERIFIER" | "SEWING_SUPERVISOR";
export type OrderStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "IN_SEWING";
export type Light = "GREEN" | "YELLOW" | "RED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface RecipeComponent {
  id: string;
  componentName: string;
  piecesPerGarment: number;
  imageUrl: string | null;
}

export interface Recipe {
  id: string;
  recipeCode: string;
  name: string;
  category: string;
  stdFabricYards: number;
  wastageCap: number;
  components: RecipeComponent[];
}

export interface VerificationItem {
  id: string;
  componentId: string;
  expectedQty: number;
  actualQty: number | null;
  status: Light | null;
  component: { componentName: string };
}

export interface VerificationLog {
  id: string;
  decision: "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  wastagePct: number;
  timestamp: string;
  verifier: { fullName: string };
}

export interface Order {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  status: OrderStatus;
  createdAt: string;
  recipe: { recipeCode: string; name: string; stdFabricYards: number; wastageCap: number };
  verificationItems: VerificationItem[];
  verificationLogs?: VerificationLog[];
}

export interface SewingOrder {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  status: OrderStatus;
  recipe: { recipeCode: string; name: string };
  verificationItems: {
    expectedQty: number;
    actualQty: number | null;
    status: Light | null;
    component: { componentName: string };
  }[];
  verificationLogs: {
    timestamp: string;
    wastagePct: number;
    verifier: { fullName: string };
  }[];
}