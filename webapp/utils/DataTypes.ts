import { EdmType } from "sap/ui/export/library";
import String from "sap/ui/model/type/String";
import ValidateException from "sap/ui/model/ValidateException";
import isEmail from "validator/es/lib/isEmail";

export type Column = {
  label?: string | undefined;
  property?: string | string[] | undefined;
  type?:
    | EdmType
    | "Currency"
    | "BigNumber"
    | "Boolean"
    | "Date"
    | "DateTime"
    | "Enumeration"
    | "Number"
    | "Percentage"
    | "String"
    | "Time"
    | "Timezone"
    | undefined;
  width?: number;
  textAlign?: string;
  scale?: number;
  autoScale?: boolean;
  delimiter?: boolean;
  unit?: string;
  unitProperty?: string;
  displayUnit?: boolean;
  trueValue?: string;
  falseValue?: string;
  template?: string;
  format?: string;
  inputFormat?: string;
  utc?: boolean;
  timezone?: string;
  timezoneProperty?: string;
  displayTimezone?: boolean;
  valueMap?: object;
  wrap?: boolean;
};

export class FieldEmail extends String {
  public constructor(...args: ConstructorParameters<typeof String>) {
    super(...args);
  }

  public override validateValue(value: string): void | Promise<void> {
    void super.validateValue(value);

    if (value !== "") {
      if (
        !isEmail(value, {
          // eslint-disable-next-line camelcase
          allow_utf8_local_part: false,
        })
      ) {
        throw new ValidateException("Invalid email address");
      }
    }
  }
}

export class FieldPhone extends String {}

export class FieldCurrency extends String {}

export class FieldId extends String {}

export class FieldPercentage extends String {}

export class FieldQuantity extends String {}
