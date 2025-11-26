import type { FilterPayload } from "base/types/filter";
import type { ODataError, ODataResponse } from "base/types/odata";
import type { FieldValueHelpItem, LeaveRequestForm, LeaveRequestItem } from "base/types/pages/main";
import { noop, sleep } from "base/utils/shared";
import type DynamicPage from "sap/f/DynamicPage";
import type { Button$PressEvent } from "sap/m/Button";
import type ComboBox from "sap/m/ComboBox";
import type DatePicker from "sap/m/DatePicker";
import type Dialog from "sap/m/Dialog";
import type { Dialog$AfterCloseEvent } from "sap/m/Dialog";
import type Input from "sap/m/Input";
import type Label from "sap/m/Label";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import type MultiComboBox from "sap/m/MultiComboBox";
import type MultiInput from "sap/m/MultiInput";
import type { RadioButtonGroup$SelectEvent } from "sap/m/RadioButtonGroup";
import type Select from "sap/m/Select";
import type TextArea from "sap/m/TextArea";
import type TimePicker from "sap/m/TimePicker";
import Token from "sap/m/Token";
import type FilterBar from "sap/ui/comp/filterbar/FilterBar";
import type { FilterBar$FilterChangeEvent } from "sap/ui/comp/filterbar/FilterBar";
import type FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import PersonalizableInfo from "sap/ui/comp/smartvariants/PersonalizableInfo";
import type SmartVariantManagement from "sap/ui/comp/smartvariants/SmartVariantManagement";
import { ValueState } from "sap/ui/core/library";
import type View from "sap/ui/core/mvc/View";
import type { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import type Router from "sap/ui/core/routing/Router";
import type Context from "sap/ui/model/Context";
import Filter from "sap/ui/model/Filter";
import JSONModel from "sap/ui/model/json/JSONModel";
import type ODataModel from "sap/ui/model/odata/v2/ODataModel";
import type Table from "sap/ui/table/Table";
import Base from "./Base.controller";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import { EdmType } from "sap/ui/export/library";
import type { Column } from "base/utils/DataTypes";
import InputBase from "sap/m/InputBase";
import type Event from "sap/ui/base/Event";
import Messaging from "sap/ui/core/Messaging";
import Core from "sap/ui/core/Core";
import MessagePopover from "sap/m/MessagePopover";
import Message from "sap/ui/core/message/Message";
import ElementRegistry from "sap/ui/core/ElementRegistry";
import MessageItem from "sap/m/MessageItem";
import type ValueStateSupport from "sap/ui/core/ValueStateSupport";
import { ButtonType } from "sap/m/library";
import MessageType from "sap/ui/core/message/MessageType";

/**
 * @namespace base.controller
 */
export default class Main extends Base {
  private view: View;
  private router: Router;
  private table: Table;
  private layout: DynamicPage;

  // Filters
  private svm: SmartVariantManagement;
  private expandedLabel: Label;
  private snappedLabel: Label;
  private filterBar: FilterBar;

  // Fragments
  private createRequestDialog: Dialog;
  private editRequestDialog: Dialog;

  // MessagePopover Manager
  private MessageManager: Messaging;
  private MessagePopover: MessagePopover;

  public override onInit(): void {
    this.view = <View>this.getView();
    this.router = this.getRouter();
    this.table = this.getControlById<Table>("table");
    this.layout = this.getControlById<DynamicPage>("dynamicPage");

    this.setModel(
      new JSONModel({
        rows: [],
        selectedIndices: [],
      }),
      "table"
    );

    this.setModel(
      new JSONModel({
        Status: [],
        LeaveType: [],
        TimeSlot: [],
      }),
      "master"
    );

    // Filters
    this.svm = this.getControlById<SmartVariantManagement>("svm");
    this.expandedLabel = this.getControlById<Label>("expandedLabel");
    this.snappedLabel = this.getControlById<Label>("snappedLabel");
    this.filterBar = this.getControlById<FilterBar>("filterBar");

    // Filter initialize
    this.filterBar.registerFetchData(this.fetchData);
    this.filterBar.registerApplyData(this.applyData);
    this.filterBar.registerGetFiltersWithValues(this.getFiltersWithValues);

    this.svm.addPersonalizableControl(
      new PersonalizableInfo({
        type: "filterBar",
        keyName: "table",
        dataSource: "",
        control: this.filterBar,
      })
    );
    this.svm.initialise(noop, this.filterBar);

    // MessagePopover Manager
    this.MessageManager = Messaging;
    this.MessageManager.removeAllMessages();
    this.setModel(this.MessageManager.getMessageModel(), "message");

    this.createMessagePopover();

    // Router
    this.router.getRoute("RouteMain")?.attachMatched(this.onObjectMatched);
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
          case this.isControl<Input>(control, "sap.m.Input"):
          case this.isControl<TextArea>(control, "sap.m.TextArea"): {
            fieldData = control.getValue();

            break;
          }
          case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
            fieldData = control.getTokens().map((token) => token.getKey());

            break;
          }
          case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
          case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
            fieldData = control.getValue();

            break;
          }
          case this.isControl<Select>(control, "sap.m.Select"):
          case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
            fieldData = control.getSelectedKey();

            break;
          }
          case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
            fieldData = control.getSelectedKeys();

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
        case this.isControl<Input>(control, "sap.m.Input"):
        case this.isControl<TextArea>(control, "sap.m.TextArea"): {
          control.setValue(<string>fieldData);

          break;
        }
        case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
          const tokens = (<string[]>fieldData).map((key) => new Token({ key, text: key }));

          control.setTokens(tokens);

          break;
        }
        case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
        case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
          control.setValue(<string>fieldData);

          break;
        }
        case this.isControl<Select>(control, "sap.m.Select"):
        case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
          control.setSelectedKey(<string>fieldData);

          break;
        }
        case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
          control.setSelectedKeys(<string[]>fieldData);

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
          case this.isControl<Input>(control, "sap.m.Input"):
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
          case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
          case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
            const value = control.getValue();

            if (value) {
              acc.push(item);
            }

            break;
          }
          case this.isControl<Select>(control, "sap.m.Select"):
          case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
            const value = control.getSelectedKey();

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

    // this.table.setShowOverlay(true);
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
    const tableModel = this.getModel<JSONModel>("table");

    const filters = this.getFilters();

    this.table.setBusy(true);
    oDataModel.read("/LeaveRequestSet", {
      filters,
      urlParameters: {},
      success: (response: ODataResponse<LeaveRequestItem[]>) => {
        this.table.setBusy(false);

        console.log("OData read success:", response.results);

        tableModel.setProperty("/rows", response.results);
      },
      error: (error: ODataError) => {
        this.table.setBusy(false);
        console.error("OData read error:", error);
      },
    });
  }

  private onRefresh() {
    this.filterBar.fireSearch();
  }

  public onSearchLegacy() {
    const tableModel = this.getModel<JSONModel>("table");

    this.table.setBusy(true);

    sleep(2000)
      .then(() => {
        const mockData: LeaveRequestItem[] = [
          {
            CreatedAt: new Date(),
            Reason: "Vacation",
            RequestId: "REQ-001",
            CreatedBy: "John Doe",
            EmployeeId: "EMP-001",
            LeaveType: "Annual Leave",
            StartDate: "2024-07-01",
            EndDate: "2024-07-10",
            Status: "Approved",
            TimeSlot: "Full Day",
          },
          {
            CreatedAt: new Date(),
            Reason: "Medical Leave",
            RequestId: "REQ-002",
            CreatedBy: "Jane Smith",
            EmployeeId: "EMP-002",
            LeaveType: "Sick Leave",
            StartDate: "2024-08-15",
            EndDate: "2024-08-20",
            Status: "Pending",
            TimeSlot: "Half Day",
          },
        ];

        this.table.setBusy(false);
        tableModel.setProperty("/rows", mockData);

        console.log("Data fetch successful:", mockData);
      })
      .catch((error) => {
        this.table.setBusy(false);
        console.error("Error during data fetch:", error);
      });
  }

  // #region Table
  public onRowSelectionChange() {
    const selectedIndices = this.table.getSelectedIndices();

    const tableModel = this.getModel<JSONModel>("table");

    tableModel.setProperty("/selectedIndices", [...selectedIndices]);
  }
  // #endregion Table

  // #region Event handlers
  // #region Create
  public async onOpenCreateRequest() {
    try {
      if (!this.createRequestDialog) {
        this.createRequestDialog = await this.loadView<Dialog>("CreateRequest");

        // Register Message once
        this.MessageManager.registerObject(this.createRequestDialog, true);

        this.createRequestDialog.addDependent(this.MessagePopover);
      }

      // Clear old messages
      this.MessageManager.removeAllMessages();

      this.createRequestDialog.setModel(
        new JSONModel({
          LeaveType: "",
          StartDate: "",
          EndDate: "",
          Reason: "",
          TimeSlot: "",
          TimeSlotIndex: 0,
        } satisfies LeaveRequestForm),
        "form"
      );

      this.createRequestDialog.open();
    } catch (error) {
      console.log(error);
    }
  }

  public onCloseCreateRequest() {
    this.createRequestDialog?.close();
    this.resetValidate(this.createRequestDialog);
  }

  public onAfterCloseCreateRequest(event: Dialog$AfterCloseEvent) {
    const dialog = event.getSource();

    dialog.setModel(null, "form");
  }

  public onSubmitCreateRequest(event: Button$PressEvent) {
    const control = event.getSource();
    const dialog = <Dialog>control.getParent();

    const formModel = <JSONModel>dialog.getModel("form");
    const formData = <LeaveRequestForm>formModel.getData();

    const oDataModel = this.getModel<ODataModel>();

    const { LeaveType, StartDate, EndDate, Reason, TimeSlot } = formData;

    // Validate with passed dialog
    const isValid = this.onValidateBeforeSubmit(this.createRequestDialog);

    if (!isValid) {
      return;
    }

    // #region Attach Change in Message to button
    this.MessagePopover.getBinding("items")?.attachChange(() =>{
				this.MessagePopover?.navigateBack();
				control.setType(this.buttonTypeFormatter());
				control.setIcon(this.buttonIconFormatter());
				control.setText(this.highestSeverityMessages());
			});
    //

    dialog.setBusy(true);
    oDataModel.create(
      "/LeaveRequestSet",
      {
        LeaveType,
        StartDate: this.formatter.toUTCDate(StartDate),
        EndDate: this.formatter.toUTCDate(EndDate),
        Reason,
        TimeSlot: "01",
        Status: "01", // New
      },
      {
        success: (response: ODataResponse<LeaveRequestItem>) => {
          dialog.setBusy(false);

          MessageToast.show("Leave request created successfully.");

          this.onCloseCreateRequest();

          this.onRefresh();
        },
        error: (error: ODataError) => {
          dialog.setBusy(false);
        },
      }
    );
  }
  // #endregion Create

  // #region Edit

  public async onOpenEditRequest() {
    try {
      if (!this.editRequestDialog) {
        this.editRequestDialog = await this.loadView<Dialog>("EditRequest");
      }
      const indices = this.table.getSelectedIndices();

      const SelectedItem = <LeaveRequestForm>this.table.getContextByIndex(indices[0])?.getObject();

      const form = {
        ...SelectedItem,
        StartDate: this.formatter.formatDate(SelectedItem.StartDate, "dd.MM.yyyy", "yyyyMMdd"),
        EndDate: this.formatter.formatDate(SelectedItem.EndDate, "dd.MM.yyyy", "yyyyMMdd"),
        TimeSlotIndex: this.timeSlotToIndex(SelectedItem.TimeSlot),
      };

      this.editRequestDialog.setModel(new JSONModel(form), "form");

      this.editRequestDialog.open();
    } catch (error) {
      console.log(error);
    }
  }

  public onCloseEditRequest() {
    this.editRequestDialog?.close();
    this.resetValidate(this.editRequestDialog);
  }

  public onSubmitEditRequest(event: Button$PressEvent) {
    const control = event.getSource();
    const dialog = <Dialog>control.getParent();

    const formModel = <JSONModel>dialog.getModel("form");
    const formData = <LeaveRequestForm>formModel.getData();

    const oDataModel = this.getModel<ODataModel>();

    const indices = this.table.getSelectedIndices();
    const item = <LeaveRequestItem>this.table?.getContextByIndex(indices[0])?.getObject();

    // Create key to edit
    const key = oDataModel.createKey("/LeaveRequestSet", item);

    const { LeaveType, StartDate, EndDate, Reason, TimeSlot } = formData;

    // Validate with passed dialog
    const isValid = this.onValidateBeforeSubmit(this.editRequestDialog);

    if (!isValid) {
      return;
    }

    dialog.setBusy(true);
    oDataModel.update(
      key,
      {
        LeaveType,
        StartDate: this.formatter.toUTCDate(StartDate, "dd.MM.yyyy"),
        EndDate: this.formatter.toUTCDate(EndDate, "dd.MM.yyyy"),
        Reason,
        TimeSlot,
      },
      {
        success: (response: ODataResponse<LeaveRequestItem>) => {
          dialog.setBusy(false);
          console.log(response);

          MessageToast.show("Leave request updated successfully.");

          this.onCloseEditRequest();

          this.onRefresh();
        },
        error: (error: ODataError) => {
          console.log(error);

          dialog.setBusy(false);
        },
      }
    );
  }

  public onAfterCloseEditRequest(event: Dialog$AfterCloseEvent) {
    const dialog = event.getSource();
    dialog.setModel(null, "form");
  }
  // #endregion Edit

  // #region Delete
  public onDeleteRequest() {
    const oDataModel = this.getModel<ODataModel>();

    const indices = this.table.getSelectedIndices();

    if (!indices.length) {
      MessageToast.show("Please select at least one request to delete.");
      return;
    }

    const item = <LeaveRequestItem>this.table.getContextByIndex(indices[0])?.getObject();

    MessageBox.confirm("Do you want to delete this request?", {
      actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
      emphasizedAction: MessageBox.Action.DELETE,
      onClose: (action: unknown) => {
        if (action === MessageBox.Action.DELETE) {
          const key = oDataModel.createKey("/LeaveRequestSet", item);

          oDataModel.remove(key, {
            success: () => {
              MessageToast.show("Leave request deleted successfully.");

              this.onRefresh();
            },
            error: (error: ODataError) => {
              console.log(error);
              MessageBox.error("Failed to delete the leave request.");
            },
          });
        }
      },
    });
  }
  // #endregion Delete
  // #endregion Event handlers

  // #region Validation

  public onChangeValue(event: Event) {
    try {
      const control = event.getSource<InputBase>();

      if (control.getVisible()) {
        this.validateControl(control);
      }


    } catch (error) {
      console.log(error);
    }
  }

  // Function to reset validate state when change dialog
  private resetValidate(container: Dialog) {
    const controls = this.getFormControlsByFieldGroup<InputBase>({
      groupId: "FormField",
      container: container,
    });
    controls.forEach((control) => {
      this.setMessageState(control, { message: "", severity: "None" });
    });
  }

  private onValidateBeforeSubmit(container: Dialog) {
    const controls = this.getFormControlsByFieldGroup<InputBase>({
      groupId: "FormField",
      container: container,
    });

    const isValid = this.validateControls(controls);

    if (isValid) {
      return true;
    } else {
      return false;
    }
  }

  private validateControls(controls: InputBase[]) {
    let isValid = false;
    let isError = false;

    controls.forEach((control) => {
      isError = this.validateControl(control);

      isValid = isValid || isError;
    });

    return !isValid;
  }

  private validateControl(control: InputBase): boolean {
    let isError = false;

    this.setMessageState(control, {
      message: "",
      severity: "None",
    });

    let requiredError = false;
    let outOfRangeError = false;
    let dateRangeError = false;
    let pastDateError = false;

    let value: string = "";

    switch (true) {
      case this.isControl<Input>(control, "sap.m.Input"): {
        value = control.getValue().trim();

        if (!value && control.getRequired()) {
          requiredError = true;
        }

        break;
      }
      case this.isControl<TextArea>(control, "sap.m.TextArea"): {
        value = control.getValue().trim();

        if (!value && control.getRequired()) {
          requiredError = true;
        }

        break;
      }
      case this.isControl<DatePicker>(control, "sap.m.DatePicker"): {
        value = control.getValue();

        if (!value && control.getRequired()) {
          requiredError = true;
        } else if (value && !control.isValidValue()) {
          outOfRangeError = true;
        } else if (this.checkPastDateError(control)) {
          pastDateError = true;
        } else {
          // Bổ sung kiểm tra ngày hợp lệ nếu cần
          dateRangeError = this.checkdateRangeError(control.getFieldGroupIds()[0]);
        }

        break;
      }
      case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
        value = control.getSelectedKey();

        const input = control.getValue().trim();

        if (!value && input) {
          outOfRangeError = true;
        } else if (!value && control.getRequired()) {
          requiredError = true;
        }

        break;
      }
      default:
        break;
    }

    if (requiredError) {
      this.setMessageState(control, {
        message: "Required",
        severity: "Error",
      });

      isError = true;
    } else if (outOfRangeError) {
      this.setMessageState(control, {
        message: "Invalid value",
        severity: "Error",
      });

      isError = true;
    } else if (pastDateError) {
      this.setMessageState(control, {
        message: "Date cannot be in the past",
        severity: "Error",
      });

      isError = true;
    } else if (dateRangeError) {
      this.setMessageState(control, {
        message: "Start date must be before end date",
        severity: "Error",
      });

      isError = true;
    }

    return isError;
  }

  private setMessageState(
    control: InputBase,
    options: {
      message: string;
      severity: keyof typeof ValueState;
    }
  ) {
    const { message, severity } = options;

    // #region Add Messages to MessageManager
    let Target = control.getBindingContext()?.getPath() + "/" + control.getBindingPath("value");

    console.log(Target);

    this.removeMessageFromTarget(Target);

    this.MessageManager.addMessages(
					new Message({
						message: message,
						type: severity,
						additionalText: control.getMetadata().getName(),
						target: Target,
						processor: this.getModel("form")
					})
				);

    control.setValueState(severity);
    control.setValueStateText?.(message);
  }

  // Fucntion to check past date return true/false
  private checkPastDateError(control: DatePicker) {
    let PastDateError = false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize today

    const pickedDate = control.getDateValue(); // returns JS Date object

    if (pickedDate && pickedDate < today) {
      PastDateError = true;
    }
    return PastDateError;
  }

  // Function to compare two dates given a FieldGroupid and return true false
  private checkdateRangeError(GroupId: string) {
    let dateRangeError = false;

    const controls = this.getFormControlsByFieldGroup<InputBase>({
      groupId: GroupId,
    });

    const startControl = <DatePicker>(
      controls.find((c) => this.isControl<DatePicker>(c, "sap.m.DatePicker") && c.getName() === "StartDate")
    );
    const endControl = <DatePicker>(
      controls.find((c) => this.isControl<DatePicker>(c, "sap.m.DatePicker") && c.getName() === "EndDate")
    );

    const datePickers = [startControl, endControl];

    const startDate = startControl?.getDateValue();
    const endDate = endControl?.getDateValue();

    if (startDate > endDate) {
      dateRangeError = true;

      // Set controls state to error
      datePickers.forEach((control) => {
        this.setMessageState(control, {
          message: "Start date must be before end date",
          severity: "Error",
        });
      });
    } else {
      // clear controls state if valid
      datePickers.forEach((control) => {
        if (
          control.getValueState() === "Error" &&
          control.getValueStateText() === "Start date must be before end date"
        ) {
          this.setMessageState(control, {
            message: "",
            severity: "None",
          });
        }
      });
    }

    return dateRangeError;
  }

  public onRadioSelectionChange(event: RadioButtonGroup$SelectEvent) {
    const control = event.getSource();

    const context = <Context>control.getBindingContext("form");
    const formModel = <JSONModel>context.getModel();
    const path = context.getPath();

    const selectedIndex = control.getSelectedIndex();

    const options = <FieldValueHelpItem[]>this.getModel("master").getProperty("/TimeSlot");

    const { FieldKey } = options[selectedIndex];

    formModel.setProperty(`${path}/TimeSlot`, FieldKey);
  }
  // #endregion Validation

  // #region Message Popover

  public handleMessagePopoverPress(event : Button$PressEvent){
    if (!this.MessagePopover) {
     this.createMessagePopover(); 
    }

    this.MessagePopover.toggle(event.getSource());
  }

  private createMessagePopover(): void {
    this.MessagePopover = new MessagePopover({
      activeTitlePress: (Event) => {
        const item = Event.getParameter("item");
        if (!item) return;

        const msg = <Message>item.getBindingContext("message")?.getObject();
        if (!msg) return;

        const controlId = msg.getControlId();
        const control = ElementRegistry.get(controlId);

        if (control && control.isFocusable?.()) {
          control.focus();
        }
      },

      items: {
        path: "message>/",
        template: new MessageItem({
          title: "{message>message}",
          subtitle: "{message>additionalText}",
          groupName: {
            parts: [{ path: "message>controlIds" }],
            // formatter: this.getGroupName.bind(this)
          },
          activeTitle: {
            parts: [{ path: "message>controlIds" }],
            // formatter: this.isPositionable.bind(this)
          },
          type: "{message>type}",
          description: "{message>message}",
        }),
      },

      groupItems: false,
    });
  }


  private removeMessageFromTarget(target: string): void {
    const messageModel = this.MessageManager.getMessageModel();
    const messages: Message[] = <Message[]>messageModel.getData() || [];

    // Find all messages whose target list contains target
    const matchedMessages = messages.filter((msg: Message) => {
      const targets = msg.getTargets?.() || [];
      return targets.includes(target);
    });

    // Remove matched Messages
    if (matchedMessages.length > 0) {
      this.MessageManager.removeMessages(matchedMessages);
    }
  }

  // Display the button type according to the message with the highest severity | Error > Warning > Success > Info
  private buttonTypeFormatter(): ButtonType {
    let HighestSeverity: ButtonType = ButtonType.Neutral;

    let Messages = <Message[]>this.MessageManager.getMessageModel().getData();

    console.log("oData ", this.MessageManager.getMessageModel().getData());
    Messages.forEach((Message: Message) => {
      switch (Message.getType()) {
        case "Error":
          HighestSeverity = ButtonType.Negative;
          break;
        case "Warning":
          HighestSeverity = HighestSeverity !== ButtonType.Negative ? ButtonType.Critical : HighestSeverity;
          break;
        case "Success":
          HighestSeverity = HighestSeverity !== ButtonType.Negative && HighestSeverity !== ButtonType.Critical  ? ButtonType.Success : HighestSeverity;
          break;
        default:
          HighestSeverity = !HighestSeverity ? ButtonType.Neutral : HighestSeverity;
          break;
      }
    });

    return HighestSeverity;
  }

  // Display the number of messages with the highest severity
  private highestSeverityMessages(): string {
    let HighestSeverityIconType : ButtonType = this.buttonTypeFormatter();

    let HighestSeverityMessageType: MessageType = MessageType.Information;

    switch (HighestSeverityIconType) {
      case ButtonType.Negative:
        HighestSeverityMessageType = MessageType.Error;
        break;

      case ButtonType.Critical:
        HighestSeverityMessageType = MessageType.Warning;
        break;

      case ButtonType.Success:
        HighestSeverityMessageType = MessageType.Success;
        break;

      default:
        HighestSeverityMessageType = HighestSeverityMessageType ?? MessageType.Information;
        break;
    }

    const messages = <Message[]>this.MessageManager.getMessageModel().getObject("/") || [];

    const count = messages.reduce((total : number, msg : Message) => {
      return msg.getType() === HighestSeverityMessageType ? total + 1 : total;
    }, 0);

    return count.toString() || "";
  }

  // Set the button icon according to the message with the highest severity
  private buttonIconFormatter() : string {
    var sIcon: string = "";
    var Messages: Message[] = <Message[]>this.MessageManager.getMessageModel().getData() || [];

    Messages.forEach((Message) => {
      switch (Message.getType()) {
        case "Error":
          sIcon = "sap-icon://error";
          break;
        case "Warning":
          sIcon = sIcon !== "sap-icon://error" ? "sap-icon://alert" : sIcon;
          break;
        case "Success":
          sIcon = sIcon !== "sap-icon://error" && sIcon !== "sap-icon://alert" ? "sap-icon://sys-enter-2" : sIcon;
          break;
        default:
          sIcon = !sIcon ? "sap-icon://information" : sIcon;
          break;
      }
    });

    return sIcon;
  }

  // #endregion Message Popover

  // #region Formatters
  public formatStatusText(statusKey: string): string {
    const map: Record<string, string> = {
      "01": "New",
      "02": "Approved",
      "03": "Rejected",
    };
    return map[statusKey] ?? statusKey;
  }

  public formatStatusState(statusKey: string): ValueState {
    const map: Record<string, ValueState> = {
      "01": ValueState.Information,
      "02": ValueState.Success,
      "03": ValueState.Error,
    };
    return map[statusKey] ?? ValueState.None;
  }
  // #endregion Formatters

  // #region Master data
  private async onGetMasterData() {
    return new Promise((resolve, reject) => {
      const oDataModel = this.getModel<ODataModel>();
      const masterModel = this.getModel("master");

      oDataModel.read("/FieldValueHelpSet", {
        success: (response: ODataResponse<FieldValueHelpItem[]>) => {
          console.log("Raw FieldValueHelpSet data:", response.results);

          const status: FieldValueHelpItem[] = [];
          const leaveType: FieldValueHelpItem[] = [];
          const timeSlot: FieldValueHelpItem[] = [];

          response.results.forEach((item) => {
            switch (item.FieldName) {
              case "Status": {
                status.push(item);
                break;
              }
              case "LeaveType": {
                leaveType.push(item);
                break;
              }
              case "TimeSlot": {
                timeSlot.push(item);
                break;
              }
              default:
                break;
            }
          });

          masterModel.setProperty("/Status", status);
          masterModel.setProperty("/LeaveType", leaveType);
          masterModel.setProperty("/TimeSlot", timeSlot);

          console.log("Master data loaded:", masterModel.getData());

          resolve(true);
        },
        error: (error: ODataError) => {
          reject(error);
        },
      });
    });
  }
  // #endregion Master data

  // #region Convert string to int for timeslot
  public timeSlotToIndex(sValue: string): number {
    if (!sValue) {
      return 0;
    }
    return parseInt(sValue, 10) - 1;
  }

  public indexToTimeSlot(iIndex: number): string {
    return (iIndex + 1).toString().padStart(2, "0");
  }
  // #endregion Convert

  // #region Excel export
  public onExportExcel(): void {
    const Cols: Column[] = [
      { label: "Mã đơn nghỉ", property: "RequestId", type: EdmType.String },
      { label: "Loại phép", property: "LeaveType", type: EdmType.String },
      {
        label: "Ngày bắt đầu",
        property: "StartDate",
        type: EdmType.Date,
        format: "dd.MM.yyyy",
      },
      {
        label: "Ngày kết thúc",
        property: "EndDate",
        type: EdmType.Date,
        format: "dd.MM.yyyy",
      },
      { label: "TimeSlot", property: "TimeSlot", type: EdmType.String },
      { label: "Lý do xin nghỉ", property: "Reason", type: EdmType.String },
      { label: "Trạng thái", property: "Status", type: EdmType.String },
    ];

    const settings = {
      workbook: { columns: Cols },
      dataSource: this.getModel<JSONModel>("table").getProperty("/rows"),
      fileName: "LeaveRequests.xlsx",
      Worker: false,
    };

    const spreadsheet = new Spreadsheet(settings);
    spreadsheet
      .build()
      .then(() => {
        console.log("Spreadsheet export successful");
      })
      .catch((err) => {
        console.error("Spreadsheet export error:", err);
      });
  }
  // #endregion Excel
}
