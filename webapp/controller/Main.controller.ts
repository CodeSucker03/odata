import type View from "sap/ui/core/mvc/View";
import Base from "./Base.controller";
import type TreeTable from "sap/ui/table/TreeTable";
import type Label from "sap/m/Label";
import type SmartVariantManagement from "sap/ui/comp/smartvariants/SmartVariantManagement";
import type Engine from "sap/m/p13n/Engine";
import type Router from "sap/ui/core/routing/Router";
import Dialog from "sap/m/Dialog";
import type FilterBar from "sap/ui/comp/filterbar/FilterBar";
import type DynamicPage from "sap/f/DynamicPage";
import JSONModel from "sap/ui/model/json/JSONModel";
import { noop } from "base/utils/shared";
import PersonalizableInfo from "sap/ui/comp/smartvariants/PersonalizableInfo";
import Filter from "sap/ui/model/Filter";
import type MultiInput from "sap/m/MultiInput";
import Token from "sap/m/Token";
import type { FilterPayload } from "base/types/filter";
import type FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import type Input from "sap/m/Input";
import TextArea from "sap/m/TextArea";
import type DatePicker from "sap/m/DatePicker";
import type TimePicker from "sap/m/TimePicker";
import type MultiComboBox from "sap/m/MultiComboBox";
import type Select from "sap/m/Select";
import type ComboBox from "sap/m/ComboBox";
import type CheckBox from "sap/m/CheckBox";
import type Switch from "sap/m/Switch";
import type {
  FilterBar$FilterChangeEvent,
  FilterBar$FilterChangeEventParameters,
} from "sap/ui/comp/filterbar/FilterBar";
import FilterOperator from "sap/ui/model/FilterOperator";
import { ValueState } from "sap/ui/core/library";
import MessageBox from "sap/m/MessageBox";
import type Table from "sap/m/Table";
import Button, { type Button$PressEvent } from "sap/m/Button";
import type { InputBase$ChangeEvent } from "sap/m/InputBase";
import type { Link$PressEvent } from "sap/m/Link";
import type ListBinding from "sap/ui/model/ListBinding";
import type { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import VBox from "sap/m/VBox";
import Sorter from "sap/ui/model/Sorter";
import Text from "sap/m/Text";
import type { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import type { ODataErrorResponse, ODataResponses } from "base/types/odata";

/**
 * @namespace base.controller
 */
export default class Main extends Base {
  private router: Router;
  private view: View;
  private table: Table;
  private layout: DynamicPage;

  //filter
  private expandedLabel: Label;
  private snappedLabel: Label;
  private svm: SmartVariantManagement;
  private filterBar: FilterBar;

  private engine: Engine;
  private sort: boolean = true;

  //Dialog
  private selectedTabIndex = 0;

  public override onInit() {
    this.view = <View>this.getView();
    this.router = this.getRouter();
    this.table = this.getControlById<Table>("tableProject");
    this.layout = this.getControlById<DynamicPage>("dynamicPage");
    this.sort = true;

    this.setModel(
      new JSONModel({
        selectedIndex: [],
      }),
      "PRItems"
    );

    this.setModel(new JSONModel({ rows: [] }), "tableProject");

    //filter
    this.svm = this.getControlById<SmartVariantManagement>("svm");
    this.expandedLabel = this.getControlById<Label>("expandedLabel");
    this.snappedLabel = this.getControlById<Label>("snappedLabel");
    this.filterBar = this.getControlById("filterBar");

    //filter initialize
    this.filterBar.registerFetchData(this.fetchData);
    this.filterBar.registerApplyData(this.applyData);
    this.filterBar.registerGetFiltersWithValues(this.getFiltersWithValues);

    this.filterBar.addEventDelegate({
      onkeydown: (event: { key: unknown }) => {
        if (event.key === "Enter") {
          this.onSearch();
        }
      },
    });

    // this.setModel(new JSONModel({ rows: [], sortCheck: true }), "tableProject");
    this.setModel(new JSONModel({ value: "" }), "lyDoHuy");

    this.svm.addPersonalizableControl(
      new PersonalizableInfo({
        type: "filterBar",
        keyName: "tableProject",
        dataSource: "",
        control: this.filterBar,
      })
    );
    this.svm.initialise(noop, this.filterBar);

    // Router
    this.router.getRoute("RouteMain")?.attachMatched(this.onObjectMatched);
  }

  public getProjectList(filters: Filter[]) {
    const tableModel = this.getModel("tableProject");

    const path: string = "/ProjectSet";
    const oDataModel = this.getModel<ODataModel>("");

    oDataModel.setUseBatch(false);
    oDataModel.read(path, {
      filters: filters,
      success: (response: any) => {
        tableModel.setProperty("/rows", response.results);
      },
      error: (error: Error) => {
        console.log(error);
      },
    });
  }

  // #region Master data
  private async onGetMasterData() {
    // return new Promise((resolve, reject) => {
    //   const oDataModel = this.getModel<ODataModel>();
    //   const masterModel = this.getModel("master");
    //   oDataModel.read("/FieldValueHelpSet", {
    //     success: (response: ODataResponses<FieldValueHelpItem[]>) => {
    //       console.log("Raw FieldValueHelpSet data:", response.results);
    //       const status: FieldValueHelpItem[] = [];
    //       const leaveType: FieldValueHelpItem[] = [];
    //       const timeSlot: FieldValueHelpItem[] = [];
    //       response.results.forEach((item) => {
    //         switch (item.FieldName) {
    //           case "Status": {
    //             status.push(item);
    //             break;
    //           }
    //           case "LeaveType": {
    //             leaveType.push(item);
    //             break;
    //           }
    //           case "TimeSlot": {
    //             timeSlot.push(item);
    //             break;
    //           }
    //           default:
    //             break;
    //         }
    //       });
    //       masterModel.setProperty("/Status", status);
    //       masterModel.setProperty("/LeaveType", leaveType);
    //       masterModel.setProperty("/TimeSlot", timeSlot);
    //       console.log("Master data loaded:", masterModel.getData());
    //       resolve(true);
    //     },
    //     error: (error: ODataError) => {
    //       reject(error);
    //     },
    //   });
    // });
  }

  // #region Lifecycle hook
  public override onAfterRendering(): void | undefined {}

  public override onExit(): void | undefined {
    this.router.getRoute("RouteMain")?.detachMatched(this.onObjectMatched);
  }
  // #endregion Lifecycle hook

  // #region Router
  private onObjectMatched = (event: Route$MatchedEvent) => {
    this.getMetadataLoaded()
      .then(() => this.onGetMasterData())
      .then(() => {
        this.filterBar.fireSearch();
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        // loading off
      });
  };
  // #endregion Router

  // #region Filters
  /**
   * Get value fields to create new filter variant
   */
  private fetchData = () => {
    return this.filterBar.getAllFilterItems(false).reduce<FilterPayload[]>((acc, item: FilterGroupItem) => {
      const control = item.getControl();
      const groupName = item.getGroupName();
      const fieldName = item.getName();

      if (control) {
        let fieldData: string | string[] = "";

        switch (true) {
          case this.isControl<Input>(control, "sap.m.Input"): {
            fieldData = control.getValue();
            break;
          }

          case this.isControl<TextArea>(control, "sap.m.TextArea"): {
            fieldData = control.getValue();
            break;
          }

          case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
            fieldData = control.getTokens().map((token) => token.getKey());
            break;
          }

          case this.isControl<DatePicker>(control, "sap.m.DatePicker"): {
            fieldData = control.getValue();
            break;
          }

          case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
            fieldData = control.getValue();
            break;
          }

          case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
            fieldData = control.getSelectedKeys();
            break;
          }

          case this.isControl<Select>(control, "sap.m.Select"): {
            fieldData = control.getSelectedKey();
            break;
          }

          case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
            fieldData = control.getSelectedKey();
            break;
          }

          case this.isControl<CheckBox>(control, "sap.m.CheckBox"): {
            fieldData = control.getSelected().toString();
            break;
          }

          case this.isControl<Switch>(control, "sap.m.Switch"): {
            fieldData = control.getState().toString();
            break;
          }
          default:
            break;
        }

        acc.push({
          groupName,
          fieldName,
          fieldData,
        });
      }

      return acc;
    }, []);
  };

  /**
   * Apply value fields from filter variant
   */
  private applyData = (data: unknown) => {
    (<FilterPayload[]>data).forEach((item) => {
      const { groupName, fieldName, fieldData } = item;
      const control = this.filterBar.determineControlByName(fieldName, groupName);

      switch (true) {
        case this.isControl<Input>(control, "sap.m.Input"): {
          control.setValue(<string>fieldData);
          break;
        }

        case this.isControl<TextArea>(control, "sap.m.TextArea"): {
          control.setValue(<string>fieldData);
          break;
        }

        case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
          const tokens = (<string[]>fieldData).map((key) => new Token({ key, text: key }));
          control.setTokens(tokens);
          break;
        }

        case this.isControl<DatePicker>(control, "sap.m.DatePicker"): {
          control.setValue(<string>fieldData);
          break;
        }

        case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
          control.setValue(<string>fieldData);
          break;
        }

        case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
          control.setSelectedKeys(<string[]>fieldData);
          break;
        }

        case this.isControl<Select>(control, "sap.m.Select"): {
          control.setSelectedKey(<string>fieldData);
          break;
        }

        case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
          control.setSelectedKey(<string>fieldData);
          break;
        }

        case this.isControl<CheckBox>(control, "sap.m.CheckBox"): {
          control.setSelected();
          break;
        }

        case this.isControl<Switch>(control, "sap.m.Switch"): {
          control.setState();
          break;
        }
        default:
          break;
      }
    });
  };

  // Get filters with values to display in labels
  private getFiltersWithValues = () => {
    return this.filterBar.getFilterGroupItems().reduce<FilterGroupItem[]>((acc, item) => {
      const control = item.getControl();

      if (control) {
        switch (true) {
          case this.isControl<Input>(control, "sap.m.Input"): {
            const value = control.getValue();

            if (value) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<TextArea>(control, "sap.m.TextArea"): {
            const value = control.getValue();

            if (value) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
            const tokens = control.getTokens();

            if (tokens.length) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<DatePicker>(control, "sap.m.DatePicker"): {
            const value = control.getValue();

            if (value) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
            const value = control.getValue();

            if (value) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
            const keys = control.getSelectedKeys();

            if (keys.length) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<Select>(control, "sap.m.Select"): {
            const key = control.getSelectedKey();

            if (key) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
            const key = control.getSelectedKey();

            if (key) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<CheckBox>(control, "sap.m.CheckBox"): {
            const value = control.getSelected().toString();

            if (value) {
              acc.push(item);
            }
            break;
          }

          case this.isControl<Switch>(control, "sap.m.Switch"): {
            const value = control.getState().toString();

            if (value) {
              acc.push(item);
            }
            break;
          }
          default:
            break;
        }
      }

      return acc;
    }, []);
  };

  public onSelectionChange(event: FilterBar$FilterChangeEvent) {
    this.svm.currentVariantSetModified(true);
    this.filterBar.fireEvent("filterChange", event);
  }

  public onFilterChange() {
    this.updateLabelsAndTable();
  }

  public onAfterVariantLoad() {
    this.updateLabelsAndTable();
  }

  private updateLabelsAndTable() {
    const expandedLabel = this.filterBar.retrieveFiltersWithValuesAsTextExpanded();
    const snappedLabel = this.filterBar.retrieveFiltersWithValuesAsText();

    this.expandedLabel.setText(expandedLabel);
    this.snappedLabel.setText(snappedLabel);

    this.table.setShowOverlay(true);
  }

  public getFilters() {
    const filters = this.filterBar.getFilterGroupItems().reduce<Filter[]>((acc, item) => {
      const control = item.getControl();
      const name = item.getName();

      switch (true) {
        case this.isControl<Input>(control, "sap.m.Input"):
        case this.isControl<TextArea>(control, "sap.m.TextArea"): {
          const value = control.getValue();

          if (value) {
            acc.push(new Filter(name, "Contains", value));
          }

          break;
        }

        case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
        case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
          const value = control.getValue();

          if (value) {
            acc.push(new Filter(name, "EQ", value));
          }

          break;
        }

        case this.isControl<Select>(control, "sap.m.Select"):
        case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
          const value = control.getSelectedKey();

          if (value) {
            acc.push(new Filter(name, "EQ", value));
          }

          break;
        }
        default:
          break;
      }

      return acc;
    }, []);

    return filters;
  }
  // #endregion Filters

  public onSearch() {
    const oDataModel = this.getModel<ODataModel>();
    const tableModel = this.getModel<JSONModel>("tableProject");

    const filters = this.getFilters();

    this.table.setBusy(true);

    oDataModel.setUseBatch(false);
    oDataModel.read("/ProjectSet", {
      filters,
      urlParameters: {},
      success: (response: ODataResponses<any>) => {
        this.table.setBusy(false);

        console.log("OData read success:", response.results);

        tableModel.setProperty("/rows", response.results);
      },
      error: (error: ODataErrorResponse) => {
        this.table.setBusy(false);
        console.error("OData read error:", error);
      },
    });

    this.table.setShowOverlay(false);
  }

  public navDetail(event: Link$PressEvent) {
    const link = event.getSource();
    const text = link.getText();
    this.router.navTo("RouteProject", { branchId: text });
  }

  public navRowDetail(event: any) {
    const item = event.getParameter("listItem").getBindingContext("tableProject").getObject();

    this.router.navTo("RouteProject", { branchId: item.branchId });
  }

  public onAddProject(event: Button$PressEvent) {
    this.router.navTo("RouteProjectCreate");
  }

  private onRefresh() {
    this.filterBar.fireSearch();
  }

  // #region Formatters
  public getStatusText(statusKey: string): string {
    const map: Record<string, string> = {
      "1": "Cho Duyet",
      "2": "Da Duyet",
    };
    return map[statusKey] ?? statusKey;
  }

  public getState(statusKey: string): string {
    const map: Record<string, string> = {
      "1": "Warning",
      "2": "Success",
    };
    return map[statusKey] ?? statusKey;
  }
}
