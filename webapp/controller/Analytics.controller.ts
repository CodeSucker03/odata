import type { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import Base from "./Base.controller";
import type { LeaveRequestItem } from "base/types/pages/main";
import type ODataModel from "sap/ui/model/odata/v2/ODataModel";
import JSONModel from "sap/ui/model/json/JSONModel";
import type { ODataError, ODataResponse, ODataResponses } from "base/types/odata";

export default class AnalyticTab extends Base {
  override onInit(): void | undefined {
    this.setModel(
      new JSONModel({
        data: [],
        insights: {
          totalLeaveDaysThisYear: 0,
          totalRequests: 0,
          requestsThisMonth: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          leaveByType: {},
          upcomingRequests: [],
          longestLeaveDays: 0,
          longestLeaveRequest: null,
        },
      }),
      "vm"
    );

    this.getRouter().getRoute("Analytics")?.attachMatched(this.onObjectMatched);
  }

  public override onExit(): void | undefined {
    this.getRouter().getRoute("Analytics")?.detachMatched(this.onObjectMatched);
  }

  // #region Router
  private onObjectMatched = (event: Route$MatchedEvent) => {
    this.getMetadataLoaded()
      .then(() => {
        //Must return the Promise from getData
        return this.getData(); 
      })
      .then(() => {
        const visualModel = this.getModel<JSONModel>("vm");

        const leaveRequests = visualModel.getProperty("/data") as LeaveRequestItem[];

        console.log(leaveRequests);

        const insights = this.buildLeaveInsights(leaveRequests);
        visualModel.setProperty("/insights", insights);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        // loading off
      });
  };

  // #endregion Router

  public getData(): Promise<LeaveRequestItem[]> {
    const oDataModel = this.getModel<ODataModel>();
    const visualModel = this.getModel<JSONModel>("vm");

    this.getView()?.setBusy(true);

    // Return the Promise object
    return new Promise((resolve, reject) => {
      oDataModel.read("/LeaveRequestSet", {
        urlParameters: {},
        success: (response: ODataResponses<LeaveRequestItem[]>) => {
          console.log("OData read success:", response.results);

          this.getView()?.setBusy(false);

          visualModel.setProperty("/data", response.results);

          // Resolve the Promise to signal success and move to the next .then()
          resolve(response.results);
        },
        error: (error: ODataError) => {
          this.getView()?.setBusy(false);

          console.error("OData read error:", error);

          //Reject the Promise to signal failure and trigger the .catch()
          reject(error);
        },
      });
    });
  }

  public getTotalLeaveDaysThisYear(leaveRequests: LeaveRequestItem[]): number {
    const currentYear = new Date().getFullYear();

    return leaveRequests.reduce((sum, req) => {
      const start = new Date(req.StartDate);
      const end = new Date(req.EndDate);

      // Only count leaves that fall within the current year
      if (start.getFullYear() === currentYear || end.getFullYear() === currentYear) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return sum + diffDays;
      }
      return sum;
    }, 0);
  }

  public diffDays(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  public buildLeaveInsights(list: LeaveRequestItem[]) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    let totalLeaveDaysThisYear = 0;
    let requestsThisMonth = 0;

    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    const leaveByType: Record<string, number> = {};

    let longestLeaveDays = 0;
    let longestLeaveRequest: LeaveRequestItem | null = null;

    const upcomingRequests: LeaveRequestItem[] = [];

    list.forEach((req) => {
      const start = new Date(req.StartDate);
      const end = new Date(req.EndDate);
      const days = this.diffDays(req.StartDate, req.EndDate);

      // Leave days this year
      if (start.getFullYear() === year || end.getFullYear() === year) {
        totalLeaveDaysThisYear += days;
      }

      // Requests in current month
      if (start.getFullYear() === year && start.getMonth() === month) {
        requestsThisMonth++;
      }

      // Status counters
      switch (req.Status) {
        case "01":
          pendingCount++;
          break;
        case "02":
          approvedCount++;
          break;
        case "03":
          rejectedCount++;
          break;
      }

      // Leave count by type
      leaveByType[req.LeaveType] = (leaveByType[req.LeaveType] || 0) + 1;

      // Find longest leave
      if (days > longestLeaveDays) {
        longestLeaveDays = days;
        longestLeaveRequest = req;
      }

      // Upcoming leaves (StartDate > now)
      if (start.getTime() > now.getTime()) {
        upcomingRequests.push(req);
      }
    });

    return {
      totalLeaveDaysThisYear,
      totalRequests: list.length,
      requestsThisMonth,
      pendingCount,
      approvedCount,
      rejectedCount,
      leaveByType,
      upcomingRequests,
      longestLeaveDays,
      longestLeaveRequest,
    };
  }
}
