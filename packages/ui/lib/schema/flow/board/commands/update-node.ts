export interface IUpdateNode {
	node: INode;
	old_node?: null | INode;
	[property: string]: any;
}

export interface INode {
	category: string;
	comment?: null | string;
	coordinates?: number[] | null;
	description: string;
	docs?: null | string;
	error?: null | string;
	event_callback?: boolean | null;
	friendly_name: string;
	icon?: null | string;
	id: string;
	layer?: null | string;
	long_running?: boolean | null;
	name: string;
	pins: { [key: string]: IPin };
	scores?: null | INodeScores;
	start?: boolean | null;
	[property: string]: any;
}

export interface IPin {
	connected_to: string[];
	data_type: IVariableType;
	default_value?: number[] | null;
	depends_on: string[];
	description: string;
	friendly_name: string;
	id: string;
	index: number;
	name: string;
	options?: null | IPinOptions;
	pin_type: IPinType;
	schema?: null | string;
	value_type: IValueType;
	[property: string]: any;
}

export enum IVariableType {
	Boolean = "Boolean",
	Byte = "Byte",
	Date = "Date",
	Execution = "Execution",
	Float = "Float",
	Generic = "Generic",
	Integer = "Integer",
	PathBuf = "PathBuf",
	String = "String",
	Struct = "Struct",
}

export interface IPinOptions {
	enforce_generic_value_type?: boolean | null;
	enforce_schema?: boolean | null;
	range?: number[] | null;
	step?: number | null;
	valid_values?: string[] | null;
	[property: string]: any;
}

export enum IPinType {
	Input = "Input",
	Output = "Output",
}

export enum IValueType {
	Array = "Array",
	HashMap = "HashMap",
	HashSet = "HashSet",
	Normal = "Normal",
}

/**
 * Represents quality metrics for a node, with scores ranging from 0 to 10. Higher scores
 * indicate worse performance in each category.
 *
 * # Score Categories * `privacy` - Measures data protection and confidentiality level *
 * `security` - Assesses resistance against potential attacks * `performance` - Evaluates
 * computational efficiency and speed * `governance` - Indicates compliance with policies
 * and regulations
 */
export interface INodeScores {
	governance: number;
	performance: number;
	privacy: number;
	security: number;
	[property: string]: any;
}
