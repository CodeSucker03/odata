import type { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import Base from "./Base.controller";
import type { LeaveRequestItem } from "base/types/pages/main";
import type ODataModel from "sap/ui/model/odata/v2/ODataModel";
import JSONModel from "sap/ui/model/json/JSONModel";
import type { ODataError, ODataResponse } from "base/types/odata";

export default class AnalyticTab extends Base {
  override onInit(): void | undefined {
    this.setModel(
      new JSONModel({
        data: [],
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
      }),
      "analytic"
    );

    this.getRouter().getRoute("Analytics")?.attachMatched(this.onObjectMatched);
  }

  public override onExit(): void | undefined {
    this.getRouter().getRoute("Analytics")?.detachMatched(this.onObjectMatched);
  }

  // #region Router
  private onObjectMatched = (event: Route$MatchedEvent) => {
    this.getMetadataLoaded()
      .then(() => this.getData())
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        // loading off
      });
  };

  // #endregion Router

  public getData() {
    const oDataModel = this.getModel<ODataModel>();
    const analyticModel = this.getModel<JSONModel>("analytic");

    oDataModel.read("/LeaveRequestSet", {
      urlParameters: {},
      success: (response: ODataResponse<LeaveRequestItem[]>) => {
        console.log("OData read success:", response.results);

        analyticModel.setProperty("/data", response.results);
      },
      error: (error: ODataError) => {
        console.error("OData read error:", error);
      },
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
}
