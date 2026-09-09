// UI-only fixture. Never imported by the production entrypoint.
export const useFinanceSession = () => ({ profile:{displayName:"検証用管理者"}, facilities:[], selectedFacilityId:"", selectedFacility:{name:"検証用保育園"}, role:"owner", isHeadOffice:true, canManageFacilityBudget:true, canApproveBudget:true, loading:false, error:"", setSelectedFacilityId:()=>{}, reload:async()=>{} });
export const useNursery = () => ({nurseryId:"qa",nurseryName:"検証用保育園",userPlan:"pro",planForFeatures:"pro",trialStatus:"active",trialDaysRemaining:7,logoUrl:null,error:null,authError:null,needsOnboarding:false,isAccountSetupInProgress:false});
export const useCreatedWebsites = () => ({hasOfficial:true,hasRecruitment:true});
export const supabase = null;
export const getNurseryContextFromEdge = async () => ({data:null});
