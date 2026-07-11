import MessageBox from "sap/m/MessageBox";
import type { FilterBar$FilterChangeEvent } from "sap/ui/comp/filterbar/FilterBar";
import type FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import PersonalizableInfo from "sap/ui/comp/smartvariants/PersonalizableInfo";
import type SmartVariantManagement from "sap/ui/comp/smartvariants/SmartVariantManagement";
import { ValueState } from "sap/ui/core/library";
import type { Route$MatchedEvent, Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type Router from "sap/ui/core/routing/Router";
import type Context from "sap/ui/model/Context";
import Filter from "sap/ui/model/Filter";
import JSONModel from "sap/ui/model/json/JSONModel";
import type ODataModel from "sap/ui/model/odata/v2/ODataModel";
import type Table from "sap/ui/table/Table";
import Base from "./Base.controller";
import type { ODataError, ODataErrorResponse, ODataResponse } from "base/types/odata";
import type { DetailRouteArgs, ProjectFormData, WorkflowData } from "base/types/pages/main";
import type { Button$PressEvent } from "sap/m/Button";

/**
 * @namespace base.controller
 */

export default class Project extends Base {
  private router: Router;
  private branchId: string;
  workItemId: any;

  public override onInit(): void {
    this.router = this.getRouter();

    let oInitialData = {
      ProjType: "",
      loaiCongTrinhKhac: "",
      ConstructionContractor: "",
      AirConditioningContractor: "",
      ElecNetCamContractor: "",
      InteriorContractor: "",
      BankName: "",
      tenNganHangKhac: "",
      Region: "",
      regionKhac: "",
      UnitType: "",
      loaiHinhDonViKhac: "",
      BookId: "",
      BranchId: "",
      BranchName: "",
      Area: "",
      areaKhac: "",
      Budget: null,
      PlanStart: "",
      PlanType: "",
      planTypeKhac: "",
      Waers: "VND",
    };

    //     let initdata = {
    //   "BranchId": "004",
    //   "ConstructionContractor": "Công ty Xây dựng ABC",
    //   "AirConditioningContractor": "Công ty Điều hòa XYZ",
    //   "ElecNetCamContractor": "Công ty Điện - Camera DEF",
    //   "InteriorContractor": "Công ty Nội thất GHI",
    //   "BranchName": "Chi nhánh Hà Nội",
    //   "BookId": "BK0000004",
    //   "ProjType": "PROJECT",
    //   "BankName": "Vietcombank",
    //   "Region": "1",
    //   "UnitType": "CN",
    //   "Area": "1",
    //   "Budget": "1500000000",
    //   "Waers": "VND",
    //   "PlanStart": "2026-09-09",
    //   "PlanType": "2"
    // }

    let oModel = new JSONModel(oInitialData);
    this.setModel(oModel, "projectInitForm");

    // Model for Project State (Buttons)
    // Status 2 = Assign Role step
    // Status 3 = Send Contract Vendor step
    let stateModel = {
      status: "",
      isApproveStage: false,
      isCreateStage: false,
      isEditInitStage: false,
      isRoleAssignStage: false,
      isContractorStage: false,
      enableButton: false,
    };

    this.setModel(new JSONModel(stateModel), "ProjectModel");

    // let oFormData = {
    //   status: "PENDING", // Statuses: DRAFT, PENDING, APPROVED, REJECTED
    //   commentText: "",
    //   // ... other form fields from earlier steps
    // };
    // this.setModel(new JSONModel(oFormData), "projectInitForm");

    // NEW: Workflow state model to simulate user permissions and logs
    let workflowData: WorkflowData = {
      userRole: "APPROVER", // Change to "CREATOR" or "APPROVER" to test visibility changes!
      history: [
        {
          approverName: "Nguyễn Văn A (Khởi tạo)",
          comment: "Hồ sơ dự án cải tạo mặt bằng phòng giao dịch chuẩn bị cho quý 3.",
          timestamp: "08/07/2026 09:00",
          action: "Khởi tạo thành công",
        },
      ],
      workItemId: false,
      status: null,
    };

    // 2. Mock Pool dữ liệu nhân sự kèm Số lượng công trình đang xử lý (currentLoads)
    let oStaffPool = {
      tkdd: [
        { id: "", name: "-- Chọn cán bộ phòng TKDD --", currentLoads: 0 },
        { id: "NV001", name: "Trần Văn Hùng", currentLoads: 2 },
        { id: "NV002", name: "Lê Thị Thảo", currentLoads: 5 }, // Quá tải!
        { id: "KHAC", name: "Khác (Nhập tay thông tin)", currentLoads: 0 },
      ],
      xdcb: [
        { id: "", name: "-- Chọn cán bộ phòng XDCB --", currentLoads: 0 },
        { id: "NV003", name: "Phạm Minh Hoàng", currentLoads: 1 },
        { id: "NV004", name: "Nguyễn Hoàng Nam", currentLoads: 3 },
        { id: "KHAC", name: "Khác (Nhập tay thông tin)", currentLoads: 0 },
      ],
      qlcl: [
        { id: "", name: "-- Chọn cán bộ bộ phận QLCL --", currentLoads: 0 },
        { id: "NV005", name: "Đặng Thúy Hà", currentLoads: 0 },
        { id: "KHAC", name: "Khác (Nhập tay thông tin)", currentLoads: 0 },
      ],
    };
    this.setModel(new JSONModel(oStaffPool), "staffPool");

    // 3. Khởi tạo cấu trúc lưu trữ dữ liệu Phân công đầu ra
    let oAssignData = {
      tkdd: { selectedKey: "", manualId: "", manualName: "", manualEmail: "" },
      giamsat: { selectedKey: "", manualId: "", manualName: "", manualEmail: "" },
      kienTruc: { selectedKey: "", manualId: "", manualName: "", manualEmail: "" },
      dienMang: { selectedKey: "", manualId: "", manualName: "", manualEmail: "" },
      duToan: { selectedKey: "", manualId: "", manualName: "", manualEmail: "" },
      quyetToan: { selectedKey: "", manualId: "", manualName: "", manualEmail: "" },
      nhnn: { selectedKey: "", manualId: "", manualName: "", manualEmail: "" },
    };
    this.setModel(new JSONModel(oAssignData), "assignData");

    this.setModel(new JSONModel(workflowData), "workflowData");

    // Mock History data
    let approvalHistoryData = {
      rows: [
        {
          Uname: "Nguyễn Văn A",
          ChangeDate: "2026-07-01",
          ChangeTime: "09:15",
          VersionNo: "01",
          CommentText: "Khởi tạo hồ sơ thành công",
        },
        {
          Uname: "Lê Thị B",
          ChangeDate: "2026-07-02",
          ChangeTime: "14:20",
          VersionNo: "02",
          CommentText: "Phê duyệt",
        },
        {
          Uname: "Trần Văn C",
          ChangeDate: "2026-07-03",
          ChangeTime: "10:00",
          VersionNo: "03",
          CommentText: "Yêu cầu sửa lại phần Ngân sách",
        },
        {
          Uname: "Phạm Thị D",
          ChangeDate: "2026-07-05",
          ChangeTime: "16:45",
          VersionNo: "04",
          CommentText: "Bổ sung thông tin nhà thầu",
        },
      ],
    };
    this.setModel(new JSONModel(approvalHistoryData), "approvalHistory");

    //Default Route
    this.router.getRoute("RouteProject")?.attachPatternMatched(this.onProductMatched);

    //Default Route End
    this.router.getRoute("RouteEditInit")?.attachPatternMatched(this.onEditInitMatched);

    this.router.getRoute("RouteProjectCreate")?.attachPatternMatched(this.onCreateMatched);

    this.router.getRoute("RouteContractor")?.attachPatternMatched(this.onContractorMatched);
    this.router.getRoute("RouteRoleAssignment")?.attachPatternMatched(this.onRoleAssignMatched);

    this.router.getRoute("RouteApproval")?.attachPatternMatched(this.onApprovalMatched);
  }

  //#region Route
  // Create Route doesnt load
  private onCreateMatched = (onCreateMatched: Route$PatternMatchedEvent) => {
    let stateModel = this.getModel("ProjectModel");
    if (stateModel) {
      stateModel.setProperty("/isCreateStage", true);
      stateModel.setProperty("/isApproveStage", false);
    }
  };

  private onApprovalMatched = (onApprovalMatched: Route$PatternMatchedEvent) => {
    this.loadMetaData(onApprovalMatched);

    let stateModel = this.getModel("ProjectModel");
    if (stateModel) {
      stateModel.setProperty("/isApproveStage", true);
      stateModel.setProperty("/isCreateStage", false);
    }
  };

  private onContractorMatched = (onMatched: Route$PatternMatchedEvent) => {
    this.loadMetaData(onMatched);

    let stateModel = this.getModel("ProjectModel");
    if (stateModel) {
      stateModel.setProperty("/isContractorStage", true);
    }
  };

  private onRoleAssignMatched = (onRoleAssignMatched: Route$PatternMatchedEvent) => {
    this.loadMetaData(onRoleAssignMatched);

    let stateModel = this.getModel("ProjectModel");
    if (stateModel) {
      stateModel.setProperty("/isRoleAssignStage", true);
    }
  };

  private onEditInitMatched = (Event: Route$PatternMatchedEvent) => {
    this.loadMetaData(Event);

    let stateModel = this.getModel("ProjectModel");
    if (stateModel) {
      stateModel.setProperty("/isEditInitStage", true);
    }
  };

  private onProductMatched = (Event: Route$PatternMatchedEvent) => {
    this.loadMetaData(Event);
  };

  private loadMetaData(Event: Route$PatternMatchedEvent) {
    this.getMetadataLoaded()
      .then(() => {
        const args = <DetailRouteArgs>Event.getParameter("arguments");
        const sBranchId = args?.branchId;

        if (sBranchId) {
          this.loadProject(sBranchId);
        }

        // Load workflow data for the project
        const oWorkflowModel = this.getModel("workflowData");

        const sWorkItemId = args?.workItemId;

        if (sWorkItemId) {
          oWorkflowModel.setProperty("/workItemId", true);
          console.log(oWorkflowModel.getData());
        }

        console.log(oWorkflowModel.getData());
      })
      .catch((error) => {
        MessageBox.error(error);
        console.log(error);
      })
      .finally(() => {
        // loading off
      });
  }

  //#region onSubmit
  // Tự động điền (Auto-fill) khi nhập Mã CN/PGD (3 chữ)
  public onBranchCodeChange(oEvent: any) {
    let oInput = oEvent.getSource();
    let sValue = oInput.getValue();

    if (sValue.length !== 3) {
      oInput.setValueState("Warning");
      oInput.setValueStateText("Mã CN phải có độ dài đúng 3 chữ số");
      return;
    } else {
      oInput.setValueState("None");
    }

    // Giả lập Logic: Hệ thống tự check với database để fill thông tin
    // Ở thực tế bạn gọi OData/REST API đến master data đơn vị ở đây
    if (sValue === "001") {
      let oModel = this.getModel("projectInitForm");
      oModel?.setProperty("/BranchName", "Chi nhánh Hà Nội - Phòng Giao Dịch Số 1");
      oModel?.setProperty("/Region", "MB");
      oModel?.setProperty("/UnitType", "PGD");
      MessageBox.information("Hệ thống tự động điền thông tin dựa trên Mã đơn vị 001.");
    }
  }

  // Submit Init Project (Khởi tạo hồ sơ du an)
  public onSubmitProject() {
    this.getView()?.setBusy(true);
    let oModel = this.getModel("projectInitForm");
    let oData = <ProjectFormData>oModel.getData();

    console.log(oData);

    // Thực hiện kiểm tra bắt buộc (Mandatory check) các trường dữ liệu cốt lõi nếu cần
    // if (!oData.ProjType || !oData.BankName || !oData.BookId || !oData.BranchId || !oData.PlanStart) {
    //   MessageBox.error("Vui lòng điền đầy đủ tất cả các trường thông tin bắt buộc!");
    //   this.getView()?.setBusy(false);
    //   return;
    // }

    const { loaiCongTrinhKhac, tenNganHangKhac, loaiHinhDonViKhac, regionKhac, areaKhac, planTypeKhac, ...payload } =
      oData;

    if (payload.ProjType === "KHAC") {
      payload.ProjType = loaiCongTrinhKhac || "";
    }
    if (payload.BankName === "KHAC") {
      payload.BankName = tenNganHangKhac || "";
    }
    if (payload.UnitType === "KHAC") {
      payload.UnitType = loaiHinhDonViKhac || "";
    }
    if (payload.Region === "KHAC") {
      payload.Region = regionKhac || "";
    }
    if (payload.Area === "KHAC") {
      payload.Area = areaKhac || "";
    }
    if (payload.PlanType === "KHAC") {
      payload.PlanType = planTypeKhac || "";
    }

    console.log(payload);

    const oDataModel = this.getModel<ODataModel>();
    oDataModel.setUseBatch(false);
    oDataModel.create("/ProjectSet", payload, {
      success: (response: ODataResponse) => {
        console.log(response);

        // Navigate
        // this.router.navTo("RouteProject", {
        //   branchId: payload.BranchId,
        // });

        // Start process
        oDataModel.create(
          "/StartProcessSet",
          {
            BranchId: payload.BranchId,
          },
          {
            success: () => {
              MessageBox.success("Hồ sơ dự án đã được khởi tạo thành công!");
            },
            error: (error: ODataErrorResponse) => {
              console.log(error);
              MessageBox.error(error.error.message.value || "Failed to start process");
            },
          }
        );

        this.getView()?.setBusy(false);
      },
      error: (error: ODataError) => {
        this.getView()?.setBusy(false);

        MessageBox.error(error as string);
      },
    });
  }

  // Step 1 Approve / Reject / Back author
  public onPressAction(event: Button$PressEvent) {
    const button = event.getSource();
    const actionData = button.data("buttonData") as string;

    const oDataModel = this.getModel<ODataModel>();

    MessageBox.confirm("Xác nhận", {
      actions: ["Xác nhận", "Huỷ"],
      emphasizedAction: "Xác nhận",
      onClose: (action: string) => {
        if (action === "Xác nhận") {
          oDataModel.create(
            "/ProcessExecuteSet",
            {
              Wild: this.workItemId,
              Action: actionData,
              BranchId: this.branchId,
            },
            {
              success: () => {
                MessageBox.success("");
                button.setEnabled(false);
              },
              error: (error: ODataErrorResponse) => {
                console.log(error);
              },
            }
          );
        }
      },
    });
  }

  // Step 2: Assign Users Submit
  public async onActionAssignSubmit(): Promise<void> {
    this.getView()?.setBusy(true);

    try {
      const assignData = this.getModel("assignData")?.getData();
      const oDataModel = this.getModel<ODataModel>();

      oDataModel.setUseBatch(false);

      const payload = {
        dienMang:
          assignData.dienMang.selectedKey === "KHAC"
            ? {
                id: assignData.dienMang.manualId,
                name: assignData.dienMang.manualName,
                email: assignData.dienMang.manualEmail,
              }
            : {
                id: assignData.dienMang.selectedKey,
              },

        duToan:
          assignData.duToan.selectedKey === "KHAC"
            ? {
                id: assignData.duToan.manualId,
                name: assignData.duToan.manualName,
                email: assignData.duToan.manualEmail,
              }
            : {
                id: assignData.duToan.selectedKey,
              },

        quyetToan:
          assignData.quyetToan.selectedKey === "KHAC"
            ? {
                id: assignData.quyetToan.manualId,
                name: assignData.quyetToan.manualName,
                email: assignData.quyetToan.manualEmail,
              }
            : {
                id: assignData.quyetToan.selectedKey,
              },

        nhnn:
          assignData.nhnn.selectedKey === "KHAC"
            ? {
                id: assignData.nhnn.manualId,
                name: assignData.nhnn.manualName,
                email: assignData.nhnn.manualEmail,
              }
            : {
                id: assignData.nhnn.selectedKey,
              },

        tkdd:
          assignData.tkdd.selectedKey === "KHAC"
            ? {
                id: assignData.tkdd.manualId,
                name: assignData.tkdd.manualName,
                email: assignData.tkdd.manualEmail,
              }
            : {
                id: assignData.tkdd.selectedKey,
              },

        giamsat:
          assignData.giamsat.selectedKey === "KHAC"
            ? {
                id: assignData.giamsat.manualId,
                name: assignData.giamsat.manualName,
                email: assignData.giamsat.manualEmail,
              }
            : {
                id: assignData.giamsat.selectedKey,
              },

        kienTruc:
          assignData.kienTruc.selectedKey === "KHAC"
            ? {
                id: assignData.kienTruc.manualId,
                name: assignData.kienTruc.manualName,
                email: assignData.kienTruc.manualEmail,
              }
            : {
                id: assignData.kienTruc.selectedKey,
              },
      };

      await new Promise<void>((resolve, reject) => {
        oDataModel.create("/AssignSet", payload, {
          success: () => resolve(),
          error: reject,
        });
      });

    } catch (e) {
      MessageBox.error((e as Error).message);
    } finally {
      this.getView()?.setBusy(false);
    }
  }

  // Step 3: Send Contract
  public onActionSendContractor() {
    const projectModel = this.getModel("projectInitForm");
    const data = <ProjectFormData>projectModel?.getData();

    if (!data) {
      MessageBox.error("Không có thông tin dự án!");
      return;
    }

    const payload = {
      BranchId: this.branchId || data.BranchId,
      ConstructionContractor: data.ConstructionContractor || "",
      AirConditioningContractor: data.AirConditioningContractor || "",
      ElecNetCamContractor: data.ElecNetCamContractor || "",
      InteriorContractor: data.InteriorContractor || "",
    };

    const oDataModel = this.getModel<ODataModel>();
    oDataModel.setUseBatch(false);
    oDataModel.create("/ContractorSet", payload, {
      success: (response: ODataResponse) => {
        console.log(response);

        this.getView()?.setBusy(false);
        MessageBox.success("Đã gửi thông tin nhà thầu thành công!");
      },
      error: (error: ODataError) => {
        this.getView()?.setBusy(false);

        MessageBox.error(error as string);
      },
    });
  }

  // Step 4-5: Approve/Reject/Back
  public onApproveProject() {}

  public onRejectProject() {}

  public onReassignProject() {}

  //#region Fetch data
  private loadProject(BranchId: string) {
    const projectInitModel = this.getModel("projectInitForm");
    const oDataModel = this.getModel<ODataModel>();

    oDataModel.setUseBatch(false);
    oDataModel.read(`/ProjectSet('${BranchId}')`, {
      success: (response: ODataResponse<ProjectFormData>) => {
        const updates: Record<string, string> = {};

        const allowedRegion = ["", "1", "2", "KHAC"];
        if (response.Region && !allowedRegion.includes(response.Region)) {
          updates.Region = "KHAC";
          updates.regionKhac = response.Region;
        } else {
          updates.regionKhac = "";
        }

        const allowedArea = ["", "1", "1B", "2", "3", "4", "5", "6", "6B", "7", "8", "8B", "9", "10", "11", "KHAC"];
        if (response.Area && !allowedArea.includes(response.Area)) {
          updates.Area = "KHAC";
          updates.areaKhac = response.Area;
        } else {
          updates.areaKhac = "";
        }

        const allowedPlanType = ["", "1", "2", "KHAC"];
        if (response.PlanType && !allowedPlanType.includes(response.PlanType)) {
          updates.PlanType = "KHAC";
          updates.planTypeKhac = response.PlanType;
        } else {
          updates.planTypeKhac = "";
        }

        const allowedProjType = ["", "DI_DOI", "MO_MOI", "THUE_THEM", "CAI_TAO", "KHAC"];
        if (response.ProjType && !allowedProjType.includes(response.ProjType)) {
          updates.ProjType = "KHAC";
          updates.loaiCongTrinhKhac = response.ProjType;
        } else {
          updates.loaiCongTrinhKhac = "";
        }

        const allowedUnitType = ["", "CN", "PGD", "HO", "KHAC"];
        if (response.UnitType && !allowedUnitType.includes(response.UnitType)) {
          updates.UnitType = "KHAC";
          updates.loaiHinhDonViKhac = response.UnitType;
        } else {
          updates.loaiHinhDonViKhac = "";
        }

        const allowedBankName = ["", "VPBANK", "GPBANK", "KHAC"];
        if (response.BankName && !allowedBankName.includes(response.BankName)) {
          updates.BankName = "KHAC";
          updates.tenNganHangKhac = response.BankName;
        } else {
          updates.tenNganHangKhac = "";
        }

        projectInitModel?.setProperty("/", {
          ...response,
          ...updates,
        });
        this.branchId = response.BranchId;

        this.getModel("ProjectModel")?.setProperty("/status", response.Status || "0");
      },
      error: (error: ODataError) => {
        MessageBox.error(error.message || "Failed to load attachments");
      },
    });
  }

  public readContractors(branchId: string) {
    const projectInitModel = this.getModel("projectInitForm");
    const oDataModel = this.getModel<ODataModel>();

    oDataModel.setUseBatch(false);
    oDataModel.read(`/ProjectSet('${branchId}')`, {
      success: (response: ODataResponse<ProjectFormData>) => {
        projectInitModel?.setProperty("/ConstructionContractor", response.ConstructionContractor || "");
        projectInitModel?.setProperty("/AirConditioningContractor", response.AirConditioningContractor || "");
        projectInitModel?.setProperty("/ElecNetCamContractor", response.ElecNetCamContractor || "");
        projectInitModel?.setProperty("/InteriorContractor", response.InteriorContractor || "");
      },
      error: (error: ODataError) => {
        MessageBox.error(error.message || "Failed to load contractors");
      },
    });
  }

  //#region  validation
  // 1. Validation định dạng mã book: VNxxxxxxx
  public onValidateMaBook(oEvent: any) {
    let oInput = oEvent.getSource();
    let sValue = oInput.getValue();
    let regex = /^VN\d{8}$/; // Ví dụ mẫu kiểm tra VN + 8 ký tự số

    if (!regex.test(sValue)) {
      oInput.setValueState("Warning");
      oInput.setValueStateText("Mã book chưa đúng định dạng (Yêu cầu: VN và 8 số tiếp theo, không thừa/thiếu ký tự)");
    } else {
      oInput.setValueState("None");
      // TODO: Gửi request kiểm tra trùng lặp trên hệ thống (Duplicate Warning)
    }
  }
}
