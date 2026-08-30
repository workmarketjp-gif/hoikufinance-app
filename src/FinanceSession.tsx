import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { getSupabaseClient } from "./lib/supabase";

export type FinanceProfile = {
  id: string;
  organizationId: string;
  facilityId: string | null;
  role: string;
  displayName: string;
  email: string | null;
};

export type FinanceFacility = {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  capacity: number | null;
};

type FinanceSessionValue = {
  profile: FinanceProfile | null;
  facilities: FinanceFacility[];
  selectedFacilityId: string;
  selectedFacility: FinanceFacility | null;
  setSelectedFacilityId: (id: string) => void;
  role: string;
  isHeadOffice: boolean;
  canManageFacilityBudget: boolean;
  canApproveBudget: boolean;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
};

const HQ_ROLES = new Set(["owner", "admin", "office_manager", "accounting_manager"]);
const FACILITY_MANAGER_ROLES = new Set(["owner", "admin", "director", "office_manager", "accounting_manager", "chief_teacher"]);

const FinanceSessionContext = createContext<FinanceSessionValue | null>(null);

export function FinanceSessionProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [facilities, setFacilities] = useState<FinanceFacility[]>([]);
  const [selectedFacilityId, setSelectedFacilityIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setSelectedFacilityId = useCallback((id: string) => {
    setSelectedFacilityIdState(id);
    if (id) window.localStorage.setItem("hf.selectedFacilityId", id);
  }, []);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseClient();
      const { data: profileRow, error: profileError } = await supabase
        .from("ho_profiles")
        .select("id,organization_id,facility_id,role,display_name,email,status")
        .eq("clerk_user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profileRow) throw new Error("Hoiku Office側に有効な職員プロフィールがありません。本部管理者へアカウント設定を確認してください。");

      const nextProfile: FinanceProfile = {
        id: String(profileRow.id),
        organizationId: String(profileRow.organization_id),
        facilityId: profileRow.facility_id ? String(profileRow.facility_id) : null,
        role: String(profileRow.role),
        displayName: String(profileRow.display_name),
        email: profileRow.email ? String(profileRow.email) : null,
      };
      setProfile(nextProfile);

      const { data: facilityRows, error: facilityError } = await supabase
        .from("ho_facilities")
        .select("id,organization_id,name,code,capacity,status")
        .eq("organization_id", nextProfile.organizationId)
        .eq("status", "active")
        .order("name");
      if (facilityError) throw facilityError;

      const nextFacilities: FinanceFacility[] = (facilityRows ?? []).map((row) => ({
        id: String(row.id),
        organizationId: String(row.organization_id),
        name: String(row.name),
        code: row.code ? String(row.code) : null,
        capacity: row.capacity == null ? null : Number(row.capacity),
      }));
      setFacilities(nextFacilities);

      const stored = window.localStorage.getItem("hf.selectedFacilityId") ?? "";
      const allowedStored = nextFacilities.some((facility) => facility.id === stored) ? stored : "";
      const profileFacility = nextProfile.facilityId && nextFacilities.some((facility) => facility.id === nextProfile.facilityId) ? nextProfile.facilityId : "";
      const first = nextFacilities[0]?.id ?? "";
      setSelectedFacilityIdState(allowedStored || profileFacility || first);
    } catch (caught) {
      setProfile(null);
      setFacilities([]);
      setSelectedFacilityIdState("");
      setError(caught instanceof Error ? caught.message : "アカウント情報を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);

  const role = profile?.role ?? "";
  const isHeadOffice = HQ_ROLES.has(role);
  const canManageFacilityBudget = FACILITY_MANAGER_ROLES.has(role);
  const canApproveBudget = isHeadOffice || role === "director";
  const selectedFacility = facilities.find((facility) => facility.id === selectedFacilityId) ?? null;

  const value = useMemo<FinanceSessionValue>(() => ({
    profile,
    facilities,
    selectedFacilityId,
    selectedFacility,
    setSelectedFacilityId,
    role,
    isHeadOffice,
    canManageFacilityBudget,
    canApproveBudget,
    loading,
    error,
    reload,
  }), [profile, facilities, selectedFacilityId, selectedFacility, setSelectedFacilityId, role, isHeadOffice, canManageFacilityBudget, canApproveBudget, loading, error, reload]);

  return <FinanceSessionContext.Provider value={value}>{children}</FinanceSessionContext.Provider>;
}

export function useFinanceSession() {
  const value = useContext(FinanceSessionContext);
  if (!value) throw new Error("useFinanceSession must be used inside FinanceSessionProvider");
  return value;
}
