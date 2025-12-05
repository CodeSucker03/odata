import type { FilterPayload } from "base/types/filter";
import type { ODataError, ODataErrorResponse, ODataResponse, ODataResponses } from "base/types/odata";
import type { FieldValueHelpItem, LeaveRequestForm, LeaveRequestItem } from "base/types/pages/main";
import { noop, sleep } from "base/utils/shared";
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
import MessagePopover from "sap/m/MessagePopover";
import Message from "sap/ui/core/message/Message";
import ElementRegistry from "sap/ui/core/ElementRegistry";
import MessageItem from "sap/m/MessageItem";
import { ButtonType } from "sap/m/library";
import MessageType from "sap/ui/core/message/MessageType";
import type Control from "sap/ui/core/Control";
import type FormElement from "sap/ui/layout/form/FormElement";
import Button from "sap/m/Button";
import type CheckBox from "sap/m/CheckBox";
import type Switch from "sap/m/Switch";
import DateTime from "base/utils/DateTime";
import ToolbarSpacer from "sap/m/ToolbarSpacer";
import type OverflowToolbar from "sap/m/OverflowToolbar";
import type { Dict } from "base/types/utils";

/**
 * @namespace base.controller
 */
export default class Main extends Base {
  private router: Router;
  private table: Table;

  // Filters
  private svm: SmartVariantManagement;
  private expandedLabel: Label;
  private snappedLabel: Label;
  private filterBar: FilterBar;

  // Fragments
  private createRequestDialog: Dialog;
  private editRequestDialog: Dialog;
  private currentActivePopoverBtn: Button;

  // Messages
  private MessageButton?: Button;
  private MessageManager: Messaging;
  private MessagePopover: MessagePopover;
  private toolbarSpacer?: ToolbarSpacer;
  private footerToolbar: OverflowToolbar;

  public override onInit(): void {
    this.router = this.getRouter();
    this.table = this.getControlById<Table>("table");

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

    // Toolbar
    this.footerToolbar = this.getControlById("footer");

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

    // Messages
    this.MessageManager = this.getMessageManager();

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

        this.addMessageButton();
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
    const tableModel = this.getModel<JSONModel>("table");

    const filters = this.getFilters();

    this.table.setBusy(true);

    oDataModel.read("/LeaveRequestSet", {
      filters,
      urlParameters: {},
      success: (response: ODataResponses<LeaveRequestItem[]>) => {
        this.table.setBusy(false);

        console.log("OData read success:", response.results);

        tableModel.setProperty("/rows", response.results);
      },
      error: (error: ODataError) => {
        this.table.setBusy(false);
        console.error("OData read error:", error);
      },
    });

    this.table.setShowOverlay(false);
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
      }

      // Get PopoverBtn
      this.currentActivePopoverBtn = this.getControlById("messagePopoverBtnCreate");

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
  }

  public onAfterCloseCreateRequest(event: Dialog$AfterCloseEvent) {
    const dialog = event.getSource();

    this.clearErrorMessages(dialog);

    this.MessageManager.removeAllMessages();

    dialog.setModel(null, "form");
  }

  public onSubmitCreateRequest(event: Button$PressEvent) {
    const control = event.getSource();
    const dialog = <Dialog>control.getParent();

    const formModel = <JSONModel>dialog.getModel("form");
    const formData = <LeaveRequestForm>formModel.getData();
    const { LeaveType, StartDate, EndDate, Reason, TimeSlot } = formData;

    const oDataModel = this.getModel<ODataModel>();

    // Validate with passed dialog
    const isValid = this.onValidateBeforeSubmit(this.createRequestDialog);
    if (!isValid) {
      return;
    }

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

      // Get PopoverBtn
      this.currentActivePopoverBtn = this.getControlById("messagePopoverBtnEdit");

      // Clear old messages
      this.MessageManager.removeAllMessages();

      // Get selected index from table
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

  public onAfterCloseEditRequest(event: Dialog$AfterCloseEvent) {
    const dialog = event.getSource();

    this.clearErrorMessages(dialog);

    dialog.setModel(null, "form");
  }

  public onCloseEditRequest() {
    this.editRequestDialog?.close();
  }

  public onSubmitEditRequest(event: Button$PressEvent) {
    const control = event.getSource();
    const dialog = <Dialog>control.getParent();

    const formModel = <JSONModel>dialog.getModel("form");
    const formData = <LeaveRequestForm>formModel.getData();
    const { LeaveType, StartDate, EndDate, Reason, TimeSlot } = formData;

    // Get selected index from table
    const indices = this.table.getSelectedIndices();
    const item = <LeaveRequestItem>this.table?.getContextByIndex(indices[0])?.getObject();

    // Create key to edit
    const oDataModel = this.getModel<ODataModel>();
    const key = oDataModel.createKey("/LeaveRequestSet", item);

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
        success: (response: ODataErrorResponse) => {
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

  // On change Input Value
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

  private onValidateBeforeSubmit(container: Dialog) {
    const controls = this.getFormControlsByFieldGroup<InputBase>({
      groupId: "FormField",
      container: container,
    });

    const isValid = this.validateControls(controls);

    if (isValid) {
      return true;
    } else {
      this.displayErrorMessage();
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

    const { target, label, processor, bindingType, model } = this.getBindingContextInfo(control);

    if (!target || !model) {
      return isError;
    }

    this.removeMessageFromTarget(target);

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
        const valueAsDate = control.getDateValue();

        if (!value && control.getRequired()) {
          requiredError = true;
        } else if (value && !control.isValidValue()) {
          outOfRangeError = true;
        } else if (!DateTime.IsSameOrAfter(valueAsDate, new Date())) {
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

    // Set Error and Message
    if (requiredError) {
      this.addMessages({
        message: "Required",
        type: "Error",
        additionalText: label,
        target,
        processor,
      });

      isError = true;
    } else if (outOfRangeError) {
      this.addMessages({
        message: "Invalid value",
        type: "Error",
        additionalText: label,
        target,
        processor,
      });

      isError = true;
    } else if (pastDateError) {
      this.addMessages({
        message: "Date cannot be in the past",
        type: "Error",
        additionalText: label,
        target,
        processor,
      });

      isError = true;
    } else if (dateRangeError) {
      this.addMessages({
        message: "Start date must be before end date",
        type: "Error",
        additionalText: label,
        target,
        processor,
      });

      isError = true;
    } else if (bindingType) {
      try {
        void bindingType.validateValue(value);
      } catch (error) {
        const { message } = <Error>error;

        this.addMessages({
          message,
          type: "Error",
          additionalText: label,
          target,
          processor,
        });
      }
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

    // Set text and state directly on control ui
    control.setValueState(severity);
    control.setValueStateText?.(message);
  }

  // Function to reset validate state when change dialog
  private clearErrorMessages(container: Dialog) {
    const controls = this.getFormControlsByFieldGroup<InputBase>({
      groupId: "FormField",
      container: container,
    });

    controls.forEach((control) => {
      this.setMessageState(control, {
        message: "",
        severity: "None",
      });
    });
  }

  public onRadioSelectionChange(event: RadioButtonGroup$SelectEvent): void {
    const control = event.getSource();

    const context = <Context>control.getBindingContext("form");
    const formModel = <JSONModel>context.getModel();
    const path = context.getPath();

    const selectedIndex = control.getSelectedIndex();

    const options = <FieldValueHelpItem[]>this.getModel("master").getProperty("/TimeSlot");

    const { FieldKey } = options[selectedIndex];

    formModel.setProperty(`${path}/TimeSlot`, FieldKey);
  }

  // Function to compare two dates given a FieldGroupid and return true false
  private checkdateRangeError(GroupId: string): boolean {
    let dateRangeError = false;

    const controls = this.getFormControlsByFieldGroup<InputBase>({
      groupId: GroupId,
    });

    const startControl = <DatePicker>(
      controls.find(
        (control) =>
          this.isControl<DatePicker>(control, "sap.m.DatePicker") &&
          control.getBinding("value")?.getPath() === "StartDate"
      )
    );
    const endControl = <DatePicker>(
      controls.find(
        (control) =>
          this.isControl<DatePicker>(control, "sap.m.DatePicker") &&
          control.getBinding("value")?.getPath() === "EndDate"
      )
    );

    const datePickers = [startControl, endControl];

    const startDate = startControl?.getDateValue();
    const endDate = endControl?.getDateValue();

    if (!DateTime.IsSameOrAfter(endDate, startDate)) {
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
        // Only clear if the error is date range error avoid clear other errors
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
  // #endregion Validation

  // #region Message Popover

  // Toggle Button Message Popover
  public handleMessagePopoverPress = (event: Button$PressEvent) => {
    if (!this.MessagePopover) {
      this.createMessagePopover();
    }

    this.MessagePopover.toggle(event.getSource());
  };

  // Add Message to Message Manager
  // private addMessageToManager(control: InputBase, message: string, severity: keyof typeof ValueState) {
  //   const BindingContextInfoTarget = this.getBindingContextInfo(control);

  //   // clear old message
  //   this.removeMessageFromTarget(BindingContextInfoTarget.target);

  //   // Add message to Message Manager Popover IF severity !== "None" to avoid adding emty message
  //   if (severity !== "None") {
  //     this.MessageManager.addMessages(
  //       new Message({
  //         message: message,
  //         type: severity,
  //         additionalText: BindingContextInfoTarget.label,
  //         target: BindingContextInfoTarget.target,
  //         processor: BindingContextInfoTarget.processor,
  //       })
  //     );
  //   }
  // }

  // Get Label in A Form layout Given a InputBase Control
  private getLabelText(control: InputBase): string {
    if (!control) return "";
    const SimpleForm = control.getParent() as FormElement;

    const Label = (<Label>SimpleForm.getLabel()).getText();
    return Label;
  }

  // Get Control Binding Path
  private getTargetPath(control: Control, modelName: string): string {
    const context = control.getBindingContext(modelName);
    if (!context) return "";

    let basePath = context.getPath(); // maybe "/", or "/form", or "/items/0"
    let propertyPath: string | undefined;

    // Determine binding property
    if (
      this.isControl<Input>(control, "sap.m.Input") ||
      this.isControl<TextArea>(control, "sap.m.TextArea") ||
      this.isControl<DatePicker>(control, "sap.m.DatePicker")
    ) {
      propertyPath = control.getBindingPath("value");
    } else if (this.isControl<ComboBox>(control, "sap.m.ComboBox")) {
      propertyPath = control.getBindingPath("selectedKey");
    } else {
      propertyPath = control.getBindingPath("value");
    }

    if (!propertyPath) return "";

    // --- FIX: remove trailing "/" on basePath to avoid double slash ---
    if (basePath === "/") {
      // root level → target is "/Property"
      return `/${propertyPath}`;
    }

    // normal case → "/form/StartDate"
    return `${basePath}/${propertyPath}`;
  }

  // #region Create MessagePopover
  private createMessagePopover(): void {
    this.MessagePopover = new MessagePopover({
      activeTitlePress: (Event) => {
        const item = Event.getParameter("item");
        if (!item) return;

        const msg = <Message>item.getBindingContext("message")?.getObject();
        console.log(msg);
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
            formatter: this.getGroupName,
          },
          activeTitle: {
            parts: [{ path: "message>controlIds" }],
            formatter: this.isPositionable,
          },
          type: "{message>type}",
          description: "{message>message}",
        }),
      },

      groupItems: true,
    });

    this.MessageButton?.addDependent(this.MessagePopover);
  }
  // #endregion Create MessagePopover

  private isPositionable = (ControlId: string) => {
    // Such a hook can be used by the application to determine if a control can be found/reached on the page and navigated to.
    return ControlId ? true : true;
  };

  private getGroupName = () => {
    return "Create Leave Request";
  };

  private getMessages() {
    return <Message[]>this.MessageManager.getMessageModel().getData();
  }

  // Remove message from a control target path
  private removeMessageFromTarget(target: string): void {
    const messages = this.getMessages();

    messages.forEach((message) => {
      if (message.getTargets().includes(target)) {
        this.MessageManager.removeMessages(message);
      }
    });
  }

  // Display the button type according to the message with the highest severity | Error > Warning > Success > Info
  private buttonTypeFormatter = () => {
    let HighestSeverity: ButtonType | undefined;

    // Retrieve All Current Message
    let Messages = <Message[]>this.MessageManager.getMessageModel().getData();

    Messages.forEach((Message: Message) => {
      switch (Message.getType()) {
        case "Error":
          HighestSeverity = ButtonType.Negative;
          break;
        case "Warning":
          HighestSeverity = HighestSeverity !== ButtonType.Negative ? ButtonType.Critical : HighestSeverity;
          break;
        case "Success":
          HighestSeverity =
            HighestSeverity !== ButtonType.Negative && HighestSeverity !== ButtonType.Critical
              ? ButtonType.Success
              : HighestSeverity;
          break;
        default:
          HighestSeverity = !HighestSeverity ? ButtonType.Neutral : HighestSeverity;
          break;
      }
    });

    return HighestSeverity;
  };

  // Display the number of messages with the highest severity
  private highestSeverityMessages = () => {
    let HighestSeverityIconType = this.buttonTypeFormatter();

    let HighestSeverityMessageType: MessageType | undefined;

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
        HighestSeverityMessageType = HighestSeverityMessageType ?? MessageType.None;
        break;
    }

    // Retrieve All Current Message
    const messages = this.getMessages();

    // Get the Highest number of Error in an Error Type
    const count = messages.reduce((total: number, msg: Message) => {
      return msg.getType() === HighestSeverityMessageType ? total + 1 : total;
    }, 0);

    return count.toString() || "";
  };

  // Set the button icon according to the message with the highest severity
  private buttonIconFormatter = () => {
    let sIcon: string = "";

    // Retrieve All Current Message
    let Messages: Message[] = <Message[]>this.MessageManager.getMessageModel().getData() || [];

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
          sIcon = !sIcon ? "sap-icon://sys-enter-2" : sIcon;
          break;
      }
    });

    return sIcon;
  };

  private displayErrorMessage() {
    if (this.MessageButton) {
      if (this.MessageButton.getDomRef()) {
        this.MessageButton.firePress();
      } else {
        this.MessageButton.addEventDelegate(this.onAfterRenderingMessageButton);
      }
    }
  }

  private onAfterRenderingMessageButton = {
    onAfterRendering: () => {
      if (this.MessageButton) {
        this.MessageButton.firePress();
        this.MessageButton.removeEventDelegate(this.onAfterRenderingMessageButton);
      }
    },
  };

  private attachMessageChange() {
    this.MessagePopover.getBinding("items")?.attachChange(() => {
      this.MessagePopover.navigateBack();

      if (this.MessageButton) {
        this.MessageButton.setType(this.buttonTypeFormatter());
        this.MessageButton.setIcon(this.buttonIconFormatter());
        this.MessageButton.setText(this.highestSeverityMessages());
      }
    });
  }

  private addMessageButton() {
    const toolbar = this.footerToolbar;

    if (!this.MessageButton) {
      this.MessageButton = new Button({
        id: "messageButton",
        visible: "{= ${message>/}.length > 0 }",
        icon: { path: "/", formatter: this.buttonIconFormatter },
        type: { path: "/", formatter: this.buttonTypeFormatter },
        text: { path: "/", formatter: this.highestSeverityMessages },
        press: this.handleMessagePopoverPress,
      });
    }

    console.log("Adding message button:", this.MessageButton);

    toolbar.insertAggregation("content", this.MessageButton, 0);

    this.createMessagePopover();
    this.attachMessageChange();

    if (!this.toolbarSpacer) {
      this.toolbarSpacer = new ToolbarSpacer();
      toolbar.insertAggregation("content", this.toolbarSpacer, 1);
    }
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

  public formatTimeSlot(timeSlotKey: string): string {
    const map: Dict<string> = {
      "01": "Full Day",
      "02": "Morning",
      "03": "Afternoon",
      "04": "Unpaid Leave",
    };
    return map[timeSlotKey] ?? timeSlotKey;
  }

  public formatLeaveType(leaveKey: string): string {
    const map: Dict<string> = {
      "01": "Annual Leave",
      "02": "Sick Leave",
      "03": "Maternity Leave",
    };
    return map[leaveKey] ?? leaveKey;
  }

  // #endregion Formatters

  // #region Master data
  private async onGetMasterData() {
    return new Promise((resolve, reject) => {
      const oDataModel = this.getModel<ODataModel>();
      const masterModel = this.getModel("master");

      oDataModel.read("/FieldValueHelpSet", {
        success: (response: ODataResponses<FieldValueHelpItem[]>) => {
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

  // region Get Analytic Data
  public onOpenAnalytics() {
    this.getRouter().navTo("Analytics");
  }

  // endregion Get Analytic Data
}
