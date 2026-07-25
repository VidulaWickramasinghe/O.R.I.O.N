import { create } from "zustand";
import type { AuroraDashboardViewId, AuroraPanelId, AuroraPanelLayoutItem } from "@/types/panels";
import type { DemoWalkthroughState } from "@/types/demo";
import type { RecordingModeState, RecordingSceneId } from "@/types/recording";
import { getRecordingScene } from "@/lib/recordingRegistry";
import { loadRecordingModeState, resetRecordingModeState, saveRecordingModeState } from "@/lib/recordingModeStorage";
import { loadDemoWalkthroughState, resetDemoWalkthroughState, saveDemoWalkthroughState } from "@/lib/demoWalkthroughStorage";
import { ORION_DEMO_WALKTHROUGH_STEPS } from "@/lib/demoWalkthroughRegistry";
import { loadActiveDashboardView, loadPanelLayoutFromStorage, resetPanelLayoutStorage, saveActiveDashboardView, savePanelLayoutToStorage } from "@/lib/panelLayoutStorage";
import { createLayoutFromPreset, movePanelLayoutItem, sortPanelLayout } from "@/lib/panelRegistry";

import type {
  SystemStatus,
  BackendSidecarStatus, DashboardIntelligence, DesktopShellStatus,
  FrontendRefactorResult, NotificationEventItem, PluginItem,
  ReleaseCandidatePackage, ReleaseCandidateStatus, ReminderItem,
  SecurityPolicyEventItem, SecurityProfileItem, StabilizationResult,
  StartupBriefing, ToolAuditEventItem, ToolPermissionItem, UserSettingsProfile,
  PublicLandingResult, UIPolishResult, ProductionReadinessResult, FinalReleaseCandidateV2, StableReleaseStatus, StableReleasePackage, PostReleaseMaintenanceResult, KnownIssue, PatchPlan, PatchReleaseStatus, PatchReleasePackage, RoadmapPlannerResult, FutureFeature, RoadmapPackage, SafetyReviewBoardResult, FeatureReview, SafetyReviewPackage,
} from "@/types/orion";
import { getSystemStatus } from "@/lib/api/status";
import { getDashboardIntelligence } from "@/lib/api/dashboard";
import { getDesktopShellStatus } from "@/lib/api/desktop";
import { getFrontendRefactorStatus, saveFrontendRefactorReport } from "@/lib/api/frontend-refactor";
import { createReminder, getNotificationEvents, getReminders, getStartupBriefing, updateReminderStatus } from "@/lib/api/notifications";
import { getPlugins, updatePluginStatus } from "@/lib/api/plugins";
import { freezeReleaseCandidate, generateReleaseCandidatePackage, getReleaseCandidateStatus, unfreezeReleaseCandidate } from "@/lib/api/release";
import { applySecurityProfile, getSecurityPolicy } from "@/lib/api/security";
import { getUserSettingsProfile, resetUserSettings, updateUserSetting } from "@/lib/api/settings";
import { getBackendSidecarStatus, runBackendSidecarAction } from "@/lib/api/sidecar";
import { runStabilizationScan, saveStabilizationReport } from "@/lib/api/stabilization";
import { getToolAudit, getToolPermissions } from "@/lib/api/tools";
import { getPublicLandingStatus, savePublicLandingReport } from "@/lib/api/public-landing";
import { getUIPolishStatus, saveUIPolishReport } from "@/lib/api/ui-polish";
import {getProductionReadinessStatus,saveProductionReadinessReport,generateFinalReleaseCandidateV2} from "@/lib/api/production-readiness";
import {getPostReleaseMaintenanceStatus,savePostReleaseMaintenanceReport,getKnownIssues,addKnownIssue,getPatchPlan} from "@/lib/api/post-release-maintenance";
import {getRoadmapPlannerStatus,saveRoadmapPlannerReport,getFutureFeatures,addFutureFeature,generateRoadmapPackage} from "@/lib/api/roadmap-planner";
import {getSafetyReviewBoardStatus,saveSafetyReviewBoardReport,getFeatureReviews,createFeatureReview,generateSafetyReviewPackage} from "@/lib/api/safety-review-board";
import {getPatchReleaseStatus,startPatchRelease,completePatchRelease,savePatchReleaseReport,generatePatchReleasePackage} from "@/lib/api/patch-release";
import {getStableReleaseStatus,lockStableRelease,unlockStableRelease,saveStableReleaseReport,generateStableReleasePackage} from "@/lib/api/stable-release";

type SidecarAction = "start" | "stop" | "restart";
type Store = {
  dashboardIntelligence: DashboardIntelligence | null;
  dashboardIntelligenceLoading: boolean;
  plugins: PluginItem[];
  pluginMetrics: Record<string, unknown>;
  pluginRegistryReport: string;
  pluginLoadingKey: string | null;
  toolPermissionMatrix: ToolPermissionItem[];
  toolPermissionMetrics: Record<string, unknown>;
  toolPermissionReport: string;
  toolAuditEvents: ToolAuditEventItem[];
  toolAuditMetrics: Record<string, unknown>;
  toolAuditReport: string;
  securityProfiles: SecurityProfileItem[];
  securityPolicyEvents: SecurityPolicyEventItem[];
  securityPolicyActive: Record<string, unknown>;
  securityPolicyReport: string;
  securityPolicyLoadingKey: string | null;
  releaseCandidateStatus: ReleaseCandidateStatus | null;
  releaseCandidatePackage: ReleaseCandidatePackage | null;
  releaseCandidateLoading: boolean;
  stabilizationResult: StabilizationResult | null;
  stabilizationLoading: boolean;
  frontendRefactorResult: FrontendRefactorResult | null;
  frontendRefactorLoading: boolean;
  publicLandingResult: PublicLandingResult | null;
  publicLandingLoading: boolean;
  uiPolishResult: UIPolishResult | null;
  uiPolishLoading: boolean;
  productionReadinessResult: ProductionReadinessResult | null;
  finalReleaseCandidateV2: FinalReleaseCandidateV2 | null;
  productionReadinessLoading: boolean;
  stableReleaseStatus: StableReleaseStatus | null;
  stableReleasePackage: StableReleasePackage | null;
  stableReleaseLoading: boolean;
  postReleaseMaintenanceResult:PostReleaseMaintenanceResult|null;
  knownIssues:KnownIssue[];
  patchPlan:PatchPlan|null;
  postReleaseMaintenanceLoading:boolean;
  patchReleaseStatus:PatchReleaseStatus|null;
  patchReleasePackage:PatchReleasePackage|null;
  patchReleaseLoading:boolean;
  roadmapPlannerResult:RoadmapPlannerResult|null;
  futureFeatures:FutureFeature[];
  roadmapPackage:RoadmapPackage|null;
  roadmapPlannerLoading:boolean;
  safetyReviewBoardResult:SafetyReviewBoardResult|null;
  featureReviews:FeatureReview[];
  safetyReviewPackage:SafetyReviewPackage|null;
  safetyReviewBoardLoading:boolean;
  desktopShellStatus: DesktopShellStatus | null;
  desktopShellLoading: boolean;
  backendSidecarStatus: BackendSidecarStatus | null;
  backendSidecarLoading: boolean;
  reminders: ReminderItem[];
  notificationEvents: NotificationEventItem[];
  startupBriefing: StartupBriefing | null;
  reminderTitle: string;
  reminderDueAt: string;
  reminderLoading: boolean;
  userSettingsProfile: UserSettingsProfile | null;
  settingsLoadingKey: string | null;
  status: SystemStatus | null;
  backendOnline: boolean;
  backendLastCheckedAt: string;
  backendLastError: string;
  checkBackendHealth: () => Promise<void>;
  lastError: string;
  activeDashboardView: AuroraDashboardViewId;
  panelLayout: AuroraPanelLayoutItem[];
  recordingModeState: RecordingModeState;
  loadRecordingModeStateFromStore: () => void;
  startRecordingModeFromStore: () => void;
  stopRecordingModeFromStore: () => void;
  setRecordingSceneFromStore: (sceneId: RecordingSceneId) => void;
  toggleRecordingLargeCalloutFromStore: () => void;
  toggleRecordingHideNoisyPanelsFromStore: () => void;
  toggleRecordingTimerFromStore: () => void;
  toggleRecordingChecklistFromStore: () => void;
  resetRecordingModeFromStore: () => void;
  demoWalkthroughState: DemoWalkthroughState;
  loadDemoWalkthroughStateFromStore: () => void;
  startDemoWalkthroughFromStore: () => void;
  stopDemoWalkthroughFromStore: () => void;
  nextDemoWalkthroughStepFromStore: () => void;
  previousDemoWalkthroughStepFromStore: () => void;
  resetDemoWalkthroughFromStore: () => void;
  loadActiveDashboardView: () => void;
  applyDashboardViewPreset: (id: AuroraDashboardViewId) => void;
  loadPanelLayout: () => void;
  togglePanelVisibility: (id: AuroraPanelId) => void;
  togglePanelPinned: (id: AuroraPanelId) => void;
  movePanelUp: (id: AuroraPanelId) => void;
  movePanelDown: (id: AuroraPanelId) => void;
  resetPanelLayout: () => void;
  getVisiblePanelLayout: () => AuroraPanelLayoutItem[];
  setReminderTitle: (value: string) => void;
  setReminderDueAt: (value: string) => void;
  patchLocalSettingValue: (key: string, value: string) => void;
  loadRoadmapPlannerStatusFromStore:()=>Promise<void>;
  saveRoadmapPlannerReportFromStore:()=>Promise<void>;
  loadFutureFeaturesFromStore:()=>Promise<void>;
  addFutureFeatureFromStore:(title:string,description:string)=>Promise<void>;
  generateRoadmapPackageFromStore:()=>Promise<void>;
  loadSafetyReviewBoardStatusFromStore:()=>Promise<void>;
  saveSafetyReviewBoardReportFromStore:()=>Promise<void>;
  loadFeatureReviewsFromStore:()=>Promise<void>;
  createFeatureReviewFromStore:(id:string)=>Promise<void>;
  generateSafetyReviewPackageFromStore:()=>Promise<void>;
  loadPostReleaseMaintenanceStatusFromStore:()=>Promise<void>;
  savePostReleaseMaintenanceReportFromStore:()=>Promise<void>;
  loadKnownIssuesFromStore:()=>Promise<void>;
  addKnownIssueFromStore:(title:string,body:string)=>Promise<void>;
  loadPatchPlanFromStore:()=>Promise<void>;
  loadPatchReleaseStatusFromStore:()=>Promise<void>;
  startPatchReleaseFromStore:()=>Promise<void>;
  completePatchReleaseFromStore:()=>Promise<void>;
  savePatchReleaseReportFromStore:()=>Promise<void>;
  generatePatchReleasePackageFromStore:()=>Promise<void>;
  loadProductionReadinessStatusFromStore:()=>Promise<void>;
  saveProductionReadinessReportFromStore:()=>Promise<void>;
  generateFinalReleaseCandidateV2FromStore:()=>Promise<void>;
  loadStableReleaseStatusFromStore:()=>Promise<void>;
  lockStableReleaseFromStore:()=>Promise<void>;
  unlockStableReleaseFromStore:()=>Promise<void>;
  saveStableReleaseReportFromStore:()=>Promise<void>;
  generateStableReleasePackageFromStore:()=>Promise<void>;
  loadPublicLandingStatusFromStore: () => Promise<void>;
  savePublicLandingReportFromStore: () => Promise<void>;
  loadUIPolishStatusFromStore: () => Promise<void>;
  saveUIPolishReportFromStore: () => Promise<void>;
  loadDashboardIntelligence: () => Promise<void>;
  loadPlugins: () => Promise<void>;
  loadToolPermissions: () => Promise<void>;
  loadToolAudit: () => Promise<void>;
  loadSecurityPolicy: () => Promise<void>;
  loadReleaseCandidateStatus: () => Promise<void>;
  loadFrontendRefactorStatus: () => Promise<void>;
  loadDesktopShellStatus: () => Promise<void>;
  loadBackendSidecarStatus: () => Promise<void>;
  loadReminders: () => Promise<void>;
  loadNotificationEvents: () => Promise<void>;
  loadStartupBriefing: () => Promise<void>;
  loadUserSettingsProfile: () => Promise<void>;
  refreshAll: () => Promise<void>;
  updatePluginStatusFromStore: (key: string, enabled: boolean) => Promise<void>;
  applySecurityProfileFromStore: (key: string) => Promise<void>;
  freezeReleaseCandidateFromStore: () => Promise<void>;
  unfreezeReleaseCandidateFromStore: () => Promise<void>;
  generateReleaseCandidatePackageFromStore: () => Promise<void>;
  runStabilizationScanFromStore: (build?: boolean) => Promise<void>;
  saveStabilizationReportFromStore: (build?: boolean) => Promise<void>;
  runFrontendRefactorScanFromStore: () => Promise<void>;
  saveFrontendRefactorReportFromStore: () => Promise<void>;
  runBackendSidecarActionFromStore: (action: SidecarAction) => Promise<void>;
  createReminderFromStore: () => Promise<void>;
  updateReminderStatusFromStore: (id: number, status: string) => Promise<void>;
  updateUserSettingFromStore: (key: string, value: string) => Promise<void>;
  resetUserSettingsFromStore: () => Promise<void>;
};
const fail = (set: (state: Partial<Store>) => void, message: string) => set({ lastError: message });
export const useAuroraStore = create<Store>((set, get) => ({
  dashboardIntelligence: null, dashboardIntelligenceLoading: false, plugins: [], pluginMetrics: {}, pluginRegistryReport: "", pluginLoadingKey: null, toolPermissionMatrix: [], toolPermissionMetrics: {}, toolPermissionReport: "", toolAuditEvents: [], toolAuditMetrics: {}, toolAuditReport: "", securityProfiles: [], securityPolicyEvents: [], securityPolicyActive: {}, securityPolicyReport: "", securityPolicyLoadingKey: null, releaseCandidateStatus: null, releaseCandidatePackage: null, releaseCandidateLoading: false, stabilizationResult: null, stabilizationLoading: false, frontendRefactorResult: null, frontendRefactorLoading: false, publicLandingResult: null, publicLandingLoading: false, uiPolishResult: null, uiPolishLoading: false, productionReadinessResult:null, finalReleaseCandidateV2:null, productionReadinessLoading:false, stableReleaseStatus:null, stableReleasePackage:null, stableReleaseLoading:false, postReleaseMaintenanceResult:null,knownIssues:[],patchPlan:null,postReleaseMaintenanceLoading:false,patchReleaseStatus:null,patchReleasePackage:null,patchReleaseLoading:false,roadmapPlannerResult:null,futureFeatures:[],roadmapPackage:null,roadmapPlannerLoading:false,safetyReviewBoardResult:null,featureReviews:[],safetyReviewPackage:null,safetyReviewBoardLoading:false, desktopShellStatus: null, desktopShellLoading: false, backendSidecarStatus: null, backendSidecarLoading: false, reminders: [], notificationEvents: [], startupBriefing: null, reminderTitle: "", reminderDueAt: "tomorrow", reminderLoading: false, userSettingsProfile: null, settingsLoadingKey: null, status: null, backendOnline: false, backendLastCheckedAt: "", backendLastError: "", lastError: "", activeDashboardView: "full-mission-control", panelLayout: [], demoWalkthroughState: { enabled: false, currentStepIndex: 0, completed: false }, recordingModeState: { enabled: false, sceneId: "opening", startedAt: "", showLargeCallout: true, hideNoisyPanels: false, showTimer: true, checklistOpen: true },
  loadRecordingModeStateFromStore: () => set({ recordingModeState: loadRecordingModeState() }),
  startRecordingModeFromStore: () => { const current = get().recordingModeState; const state: RecordingModeState = { ...current, enabled: true, startedAt: new Date().toISOString() }; saveRecordingModeState(state); set({ recordingModeState: state }); get().applyDashboardViewPreset(getRecordingScene(state.sceneId).viewId); },
  stopRecordingModeFromStore: () => { const state = { ...get().recordingModeState, enabled: false }; saveRecordingModeState(state); set({ recordingModeState: state }); },
  setRecordingSceneFromStore: (sceneId) => { const state = { ...get().recordingModeState, sceneId }; saveRecordingModeState(state); set({ recordingModeState: state }); get().applyDashboardViewPreset(getRecordingScene(sceneId).viewId); },
  toggleRecordingLargeCalloutFromStore: () => { const state = { ...get().recordingModeState, showLargeCallout: !get().recordingModeState.showLargeCallout }; saveRecordingModeState(state); set({ recordingModeState: state }); },
  toggleRecordingHideNoisyPanelsFromStore: () => { const state = { ...get().recordingModeState, hideNoisyPanels: !get().recordingModeState.hideNoisyPanels }; saveRecordingModeState(state); set({ recordingModeState: state }); },
  toggleRecordingTimerFromStore: () => { const state = { ...get().recordingModeState, showTimer: !get().recordingModeState.showTimer }; saveRecordingModeState(state); set({ recordingModeState: state }); },
  toggleRecordingChecklistFromStore: () => { const state = { ...get().recordingModeState, checklistOpen: !get().recordingModeState.checklistOpen }; saveRecordingModeState(state); set({ recordingModeState: state }); },
  resetRecordingModeFromStore: () => set({ recordingModeState: resetRecordingModeState() }),
  loadDemoWalkthroughStateFromStore: () => set({ demoWalkthroughState: loadDemoWalkthroughState() }),
  startDemoWalkthroughFromStore: () => { const state: DemoWalkthroughState = { enabled: true, currentStepIndex: 0, completed: false }; saveDemoWalkthroughState(state); set({ demoWalkthroughState: state }); get().applyDashboardViewPreset(ORION_DEMO_WALKTHROUGH_STEPS[0].viewId); },
  stopDemoWalkthroughFromStore: () => { const state = { ...get().demoWalkthroughState, enabled: false }; saveDemoWalkthroughState(state); set({ demoWalkthroughState: state }); },
  nextDemoWalkthroughStepFromStore: () => { const current = get().demoWalkthroughState; const finalIndex = ORION_DEMO_WALKTHROUGH_STEPS.length - 1; const currentStepIndex = Math.min(current.currentStepIndex + 1, finalIndex); const state: DemoWalkthroughState = { enabled: true, currentStepIndex, completed: currentStepIndex === finalIndex }; saveDemoWalkthroughState(state); set({ demoWalkthroughState: state }); get().applyDashboardViewPreset(ORION_DEMO_WALKTHROUGH_STEPS[currentStepIndex].viewId); },
  previousDemoWalkthroughStepFromStore: () => { const currentStepIndex = Math.max(get().demoWalkthroughState.currentStepIndex - 1, 0); const state: DemoWalkthroughState = { enabled: true, currentStepIndex, completed: false }; saveDemoWalkthroughState(state); set({ demoWalkthroughState: state }); get().applyDashboardViewPreset(ORION_DEMO_WALKTHROUGH_STEPS[currentStepIndex].viewId); },
  resetDemoWalkthroughFromStore: () => set({ demoWalkthroughState: resetDemoWalkthroughState() }),
  checkBackendHealth: async () => { try { const status = await getSystemStatus(); set({ status, backendOnline: true, backendLastCheckedAt: new Date().toISOString(), backendLastError: "" }); } catch { set({ status: null, backendOnline: false, backendLastCheckedAt: new Date().toISOString(), backendLastError: "Backend health check failed.", lastError: "Backend health check failed." }); } },
  loadActiveDashboardView: () => set({ activeDashboardView: loadActiveDashboardView() }),
  applyDashboardViewPreset: (id) => { const panelLayout = sortPanelLayout(createLayoutFromPreset(id)); savePanelLayoutToStorage(panelLayout); saveActiveDashboardView(id); set({ activeDashboardView: id, panelLayout }); },
  loadPanelLayout: () => set({ panelLayout: sortPanelLayout(loadPanelLayoutFromStorage()) }),
  togglePanelVisibility: (id) => { const layout = sortPanelLayout(get().panelLayout.map((item) => item.id === id ? { ...item, visible: !item.visible } : item)); savePanelLayoutToStorage(layout); set({ panelLayout: layout }); },
  togglePanelPinned: (id) => { const layout = sortPanelLayout(get().panelLayout.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item)); savePanelLayoutToStorage(layout); set({ panelLayout: layout }); },
  movePanelUp: (id) => { const next = movePanelLayoutItem(get().panelLayout, id, -1); savePanelLayoutToStorage(next); set({ panelLayout: next }); },
  movePanelDown: (id) => { const next = movePanelLayoutItem(get().panelLayout, id, 1); savePanelLayoutToStorage(next); set({ panelLayout: next }); },
  resetPanelLayout: () => { const panelLayout = sortPanelLayout(resetPanelLayoutStorage()); saveActiveDashboardView("full-mission-control"); set({ activeDashboardView: "full-mission-control", panelLayout }); },
  getVisiblePanelLayout: () => sortPanelLayout(get().panelLayout).filter((item) => item.visible),
  setReminderTitle: (reminderTitle) => set({ reminderTitle }), setReminderDueAt: (reminderDueAt) => set({ reminderDueAt }),
  patchLocalSettingValue: (key, value) => set((s) => !s.userSettingsProfile ? s : { userSettingsProfile: { ...s.userSettingsProfile, settings: s.userSettingsProfile.settings.map((item) => item.key === key ? { ...item, value } : item) } }),
  loadRoadmapPlannerStatusFromStore:async()=>{set({roadmapPlannerLoading:true});try{const d=await getRoadmapPlannerStatus();set({roadmapPlannerResult:d,futureFeatures:d.roadmap_plan.features,lastError:""})}catch{fail(set,"Failed to load roadmap.")}finally{set({roadmapPlannerLoading:false})}},
  saveRoadmapPlannerReportFromStore:async()=>{set({roadmapPlannerLoading:true});try{const d=await saveRoadmapPlannerReport();set({roadmapPlannerResult:d,futureFeatures:d.roadmap_plan.features,lastError:""})}catch{fail(set,"Failed to save roadmap.")}finally{set({roadmapPlannerLoading:false})}},
  loadFutureFeaturesFromStore:async()=>{try{set({futureFeatures:(await getFutureFeatures()).features,lastError:""})}catch{fail(set,"Failed to load features.")}},
  addFutureFeatureFromStore:async(title,description)=>{set({roadmapPlannerLoading:true});try{await addFutureFeature(title,description);const d=await getRoadmapPlannerStatus();set({roadmapPlannerResult:d,futureFeatures:d.roadmap_plan.features,lastError:""})}catch{fail(set,"Failed to add feature.")}finally{set({roadmapPlannerLoading:false})}},
  generateRoadmapPackageFromStore:async()=>{set({roadmapPlannerLoading:true});try{set({roadmapPackage:await generateRoadmapPackage(),lastError:""})}catch{fail(set,"Failed to generate roadmap package.")}finally{set({roadmapPlannerLoading:false})}},
  loadSafetyReviewBoardStatusFromStore:async()=>{set({safetyReviewBoardLoading:true});try{const d=await getSafetyReviewBoardStatus();set({safetyReviewBoardResult:d,featureReviews:d.reviews,lastError:""})}catch{fail(set,"Failed to load safety board.")}finally{set({safetyReviewBoardLoading:false})}},
  saveSafetyReviewBoardReportFromStore:async()=>{set({safetyReviewBoardLoading:true});try{const d=await saveSafetyReviewBoardReport();set({safetyReviewBoardResult:d,featureReviews:d.reviews,lastError:""})}catch{fail(set,"Failed to save safety report.")}finally{set({safetyReviewBoardLoading:false})}},
  loadFeatureReviewsFromStore:async()=>{try{set({featureReviews:(await getFeatureReviews()).reviews,lastError:""})}catch{fail(set,"Failed to load reviews.")}},
  createFeatureReviewFromStore:async(id)=>{set({safetyReviewBoardLoading:true});try{const d=await createFeatureReview(id);set({safetyReviewBoardResult:d.snapshot,featureReviews:d.snapshot.reviews,lastError:""})}catch{fail(set,"Failed to create review.")}finally{set({safetyReviewBoardLoading:false})}},
  generateSafetyReviewPackageFromStore:async()=>{set({safetyReviewBoardLoading:true});try{set({safetyReviewPackage:await generateSafetyReviewPackage(),lastError:""})}catch{fail(set,"Failed to generate safety package.")}finally{set({safetyReviewBoardLoading:false})}},
  loadPostReleaseMaintenanceStatusFromStore:async()=>{set({postReleaseMaintenanceLoading:true});try{const d=await getPostReleaseMaintenanceStatus();set({postReleaseMaintenanceResult:d,patchPlan:d.patch_plan,lastError:""})}catch{fail(set,"Failed to load maintenance status.")}finally{set({postReleaseMaintenanceLoading:false})}},
  savePostReleaseMaintenanceReportFromStore:async()=>{set({postReleaseMaintenanceLoading:true});try{const d=await savePostReleaseMaintenanceReport();set({postReleaseMaintenanceResult:d,patchPlan:d.patch_plan,lastError:""})}catch{fail(set,"Failed to save maintenance report.")}finally{set({postReleaseMaintenanceLoading:false})}},
  loadKnownIssuesFromStore:async()=>{try{set({knownIssues:(await getKnownIssues()).issues,lastError:""})}catch{fail(set,"Failed to load known issues.")}},
  addKnownIssueFromStore:async(title,body)=>{set({postReleaseMaintenanceLoading:true});try{const d=await addKnownIssue(title,body);const issues=await getKnownIssues();set({knownIssues:issues.issues,patchPlan:d.patch_plan,lastError:""})}catch{fail(set,"Failed to add known issue.")}finally{set({postReleaseMaintenanceLoading:false})}},
  loadPatchPlanFromStore:async()=>{try{set({patchPlan:await getPatchPlan(),lastError:""})}catch{fail(set,"Failed to load patch plan.")}},
  loadPatchReleaseStatusFromStore:async()=>{set({patchReleaseLoading:true});try{set({patchReleaseStatus:await getPatchReleaseStatus(),lastError:""})}catch{fail(set,"Failed to load patch release.")}finally{set({patchReleaseLoading:false})}},
  startPatchReleaseFromStore:async()=>{set({patchReleaseLoading:true});try{await startPatchRelease();set({patchReleaseStatus:await getPatchReleaseStatus(),lastError:""})}catch{fail(set,"Failed to start patch release.")}finally{set({patchReleaseLoading:false})}},
  completePatchReleaseFromStore:async()=>{set({patchReleaseLoading:true});try{await completePatchRelease();set({patchReleaseStatus:await getPatchReleaseStatus(),lastError:""})}catch{fail(set,"Failed to complete patch release.")}finally{set({patchReleaseLoading:false})}},
  savePatchReleaseReportFromStore:async()=>{set({patchReleaseLoading:true});try{set({patchReleaseStatus:await savePatchReleaseReport(),lastError:""})}catch{fail(set,"Failed to save patch report.")}finally{set({patchReleaseLoading:false})}},
  generatePatchReleasePackageFromStore:async()=>{set({patchReleaseLoading:true});try{set({patchReleasePackage:await generatePatchReleasePackage(),lastError:""})}catch{fail(set,"Failed to generate patch package.")}finally{set({patchReleaseLoading:false})}},
  loadProductionReadinessStatusFromStore:async()=>{set({productionReadinessLoading:true});try{set({productionReadinessResult:await getProductionReadinessStatus(),lastError:""})}catch{fail(set,"Failed to load production readiness.")}finally{set({productionReadinessLoading:false})}},
  saveProductionReadinessReportFromStore:async()=>{set({productionReadinessLoading:true});try{set({productionReadinessResult:await saveProductionReadinessReport(),lastError:""})}catch{fail(set,"Failed to save production readiness.")}finally{set({productionReadinessLoading:false})}},
  generateFinalReleaseCandidateV2FromStore:async()=>{set({productionReadinessLoading:true});try{set({finalReleaseCandidateV2:await generateFinalReleaseCandidateV2(),lastError:""})}catch{fail(set,"Failed to generate RC v2.")}finally{set({productionReadinessLoading:false})}},
  loadStableReleaseStatusFromStore:async()=>{set({stableReleaseLoading:true});try{set({stableReleaseStatus:await getStableReleaseStatus(),lastError:""})}catch{fail(set,"Failed to load stable release.")}finally{set({stableReleaseLoading:false})}},
  lockStableReleaseFromStore:async()=>{set({stableReleaseLoading:true});try{await lockStableRelease("O.R.I.O.N. stable public release lock.");set({stableReleaseStatus:await getStableReleaseStatus(),lastError:""})}catch{fail(set,"Failed to lock stable release.")}finally{set({stableReleaseLoading:false})}},
  unlockStableReleaseFromStore:async()=>{set({stableReleaseLoading:true});try{await unlockStableRelease("Stable release lock lifted.");set({stableReleaseStatus:await getStableReleaseStatus(),lastError:""})}catch{fail(set,"Failed to unlock stable release.")}finally{set({stableReleaseLoading:false})}},
  saveStableReleaseReportFromStore:async()=>{set({stableReleaseLoading:true});try{set({stableReleaseStatus:await saveStableReleaseReport(),lastError:""})}catch{fail(set,"Failed to save stable release report.")}finally{set({stableReleaseLoading:false})}},
  generateStableReleasePackageFromStore:async()=>{set({stableReleaseLoading:true});try{set({stableReleasePackage:await generateStableReleasePackage(),lastError:""})}catch{fail(set,"Failed to generate stable release package.")}finally{set({stableReleaseLoading:false})}},
  loadPublicLandingStatusFromStore: async () => { set({ publicLandingLoading: true }); try { set({ publicLandingResult: await getPublicLandingStatus(), lastError: "" }); } catch { fail(set, "Failed to load public landing status."); } finally { set({ publicLandingLoading: false }); } },
  savePublicLandingReportFromStore: async () => { set({ publicLandingLoading: true }); try { set({ publicLandingResult: await savePublicLandingReport(), lastError: "" }); } catch { fail(set, "Failed to save public landing report."); } finally { set({ publicLandingLoading: false }); } },
  loadUIPolishStatusFromStore: async () => { set({ uiPolishLoading: true }); try { set({ uiPolishResult: await getUIPolishStatus(), lastError: "" }); } catch { fail(set, "Failed to load UI polish status."); } finally { set({ uiPolishLoading: false }); } },
  saveUIPolishReportFromStore: async () => { set({ uiPolishLoading: true }); try { set({ uiPolishResult: await saveUIPolishReport(), lastError: "" }); } catch { fail(set, "Failed to save UI polish report."); } finally { set({ uiPolishLoading: false }); } },
  loadDashboardIntelligence: async () => { set({ dashboardIntelligenceLoading: true }); try { set({ dashboardIntelligence: await getDashboardIntelligence(), lastError: "" }); } catch { fail(set, "Failed to load dashboard intelligence."); } finally { set({ dashboardIntelligenceLoading: false }); } },
  loadPlugins: async () => { try { const d = await getPlugins(); set({ plugins: d.plugins || [], pluginMetrics: d.metrics || {}, pluginRegistryReport: d.report || "" }); } catch { fail(set, "Failed to load plugins."); } },
  loadToolPermissions: async () => { try { const d = await getToolPermissions(); set({ toolPermissionMatrix: d.matrix || [], toolPermissionMetrics: d.metrics || {}, toolPermissionReport: d.report || "" }); } catch { fail(set, "Failed to load tool permissions."); } },
  loadToolAudit: async () => { try { const d = await getToolAudit(); set({ toolAuditEvents: d.events || [], toolAuditMetrics: d.metrics || {}, toolAuditReport: d.report || "" }); } catch { fail(set, "Failed to load tool audit."); } },
  loadSecurityPolicy: async () => { try { const d = await getSecurityPolicy(); set({ securityProfiles: d.profiles || [], securityPolicyEvents: d.events || [], securityPolicyActive: d.active_policy || {}, securityPolicyReport: d.report || "" }); } catch { fail(set, "Failed to load security policy."); } },
  loadReleaseCandidateStatus: async () => { try { set({ releaseCandidateStatus: await getReleaseCandidateStatus() }); } catch { fail(set, "Failed to load release candidate status."); } },
  loadFrontendRefactorStatus: async () => { set({ frontendRefactorLoading: true }); try { set({ frontendRefactorResult: await getFrontendRefactorStatus() }); } catch { fail(set, "Failed to load frontend refactor status."); } finally { set({ frontendRefactorLoading: false }); } },
  loadDesktopShellStatus: async () => { set({ desktopShellLoading: true }); try { set({ desktopShellStatus: await getDesktopShellStatus() }); } catch { fail(set, "Failed to load desktop shell status."); } finally { set({ desktopShellLoading: false }); } },
  loadBackendSidecarStatus: async () => { set({ backendSidecarLoading: true }); try { set({ backendSidecarStatus: await getBackendSidecarStatus() }); } catch { fail(set, "Failed to load backend sidecar status."); } finally { set({ backendSidecarLoading: false }); } },
  loadReminders: async () => { try { set({ reminders: (await getReminders()).reminders || [] }); } catch { fail(set, "Failed to load reminders."); } }, loadNotificationEvents: async () => { try { set({ notificationEvents: (await getNotificationEvents()).events || [] }); } catch { fail(set, "Failed to load notification events."); } }, loadStartupBriefing: async () => { try { set({ startupBriefing: await getStartupBriefing() }); } catch { fail(set, "Failed to load startup briefing."); } }, loadUserSettingsProfile: async () => { try { set({ userSettingsProfile: await getUserSettingsProfile() }); } catch { fail(set, "Failed to load user settings."); } },
  refreshAll: async () => { await Promise.allSettled([get().checkBackendHealth(), get().loadDashboardIntelligence(), get().loadPlugins(), get().loadToolPermissions(), get().loadToolAudit(), get().loadSecurityPolicy(), get().loadReleaseCandidateStatus(), get().loadFrontendRefactorStatus(), get().loadDesktopShellStatus(), get().loadBackendSidecarStatus(), get().loadReminders(), get().loadNotificationEvents(), get().loadStartupBriefing(), get().loadUserSettingsProfile()]); },
  updatePluginStatusFromStore: async (key, enabled) => { set({ pluginLoadingKey: key }); try { await updatePluginStatus(key, enabled); await Promise.all([get().loadPlugins(), get().loadToolPermissions(), get().loadToolAudit(), get().loadDashboardIntelligence()]); } finally { set({ pluginLoadingKey: null }); } }, applySecurityProfileFromStore: async (key) => { set({ securityPolicyLoadingKey: key }); try { await applySecurityProfile(key); await get().refreshAll(); } finally { set({ securityPolicyLoadingKey: null }); } },
  freezeReleaseCandidateFromStore: async () => { set({ releaseCandidateLoading: true }); try { await freezeReleaseCandidate("Preparing O.R.I.O.N. v4.5 release candidate."); await get().refreshAll(); } finally { set({ releaseCandidateLoading: false }); } }, unfreezeReleaseCandidateFromStore: async () => { set({ releaseCandidateLoading: true }); try { await unfreezeReleaseCandidate("Release candidate freeze lifted by user."); await get().refreshAll(); } finally { set({ releaseCandidateLoading: false }); } }, generateReleaseCandidatePackageFromStore: async () => { set({ releaseCandidateLoading: true }); try { set({ releaseCandidatePackage: await generateReleaseCandidatePackage() }); await get().loadReleaseCandidateStatus(); } finally { set({ releaseCandidateLoading: false }); } },
  runStabilizationScanFromStore: async (build = false) => { set({ stabilizationLoading: true }); try { set({ stabilizationResult: await runStabilizationScan(build) }); } finally { set({ stabilizationLoading: false }); } }, saveStabilizationReportFromStore: async (build = false) => { set({ stabilizationLoading: true }); try { set({ stabilizationResult: await saveStabilizationReport(build) }); } finally { set({ stabilizationLoading: false }); } }, runFrontendRefactorScanFromStore: async () => get().loadFrontendRefactorStatus(), saveFrontendRefactorReportFromStore: async () => { set({ frontendRefactorLoading: true }); try { set({ frontendRefactorResult: await saveFrontendRefactorReport() }); } finally { set({ frontendRefactorLoading: false }); } },
  runBackendSidecarActionFromStore: async (action) => { set({ backendSidecarLoading: true }); try { set({ backendSidecarStatus: (await runBackendSidecarAction(action)).sidecar }); } finally { set({ backendSidecarLoading: false }); } }, createReminderFromStore: async () => { const { reminderTitle, reminderDueAt } = get(); if (!reminderTitle.trim()) return fail(set, "Reminder title is required."); set({ reminderLoading: true }); try { await createReminder({ title: reminderTitle.trim(), description: "Created from Aurora OS.", due_at: reminderDueAt || "tomorrow", priority: "medium" }); set({ reminderTitle: "" }); await Promise.all([get().loadReminders(), get().loadNotificationEvents()]); } finally { set({ reminderLoading: false }); } }, updateReminderStatusFromStore: async (id, status) => { await updateReminderStatus(id, status); await Promise.all([get().loadReminders(), get().loadNotificationEvents()]); }, updateUserSettingFromStore: async (key, value) => { set({ settingsLoadingKey: key }); try { await updateUserSetting(key, value); await get().loadUserSettingsProfile(); } finally { set({ settingsLoadingKey: null }); } }, resetUserSettingsFromStore: async () => { set({ settingsLoadingKey: "reset" }); try { await resetUserSettings(); await get().loadUserSettingsProfile(); } finally { set({ settingsLoadingKey: null }); } },
}));
