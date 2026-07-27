import { $t as Table, Gt as sql, cn as Column, dt as textDecoder, ln as entityKind, nt as getColumnNameAndConfig, on as TableName, sn as ColumnBuilder } from "./drizzle-orm-DLyyecfE.js";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/foreign-keys.js
var ForeignKeyBuilder = class {
	static [entityKind] = "SQLiteForeignKeyBuilder";
	/** @internal */
	reference;
	/** @internal */
	_onUpdate;
	/** @internal */
	_onDelete;
	constructor(config, actions) {
		this.reference = () => {
			const { name, columns, foreignColumns } = config();
			return {
				name,
				columns,
				foreignTable: foreignColumns[0].table,
				foreignColumns
			};
		};
		if (actions) {
			this._onUpdate = actions.onUpdate;
			this._onDelete = actions.onDelete;
		}
	}
	onUpdate(action) {
		this._onUpdate = action;
		return this;
	}
	onDelete(action) {
		this._onDelete = action;
		return this;
	}
	/** @internal */
	build(table) {
		return new ForeignKey(table, this);
	}
};
var ForeignKey = class {
	constructor(table, builder) {
		this.table = table;
		this.reference = builder.reference;
		this.onUpdate = builder._onUpdate;
		this.onDelete = builder._onDelete;
	}
	static [entityKind] = "SQLiteForeignKey";
	reference;
	onUpdate;
	onDelete;
	getName() {
		const { name, columns, foreignColumns } = this.reference();
		const columnNames = columns.map((column) => column.name);
		const foreignColumnNames = foreignColumns.map((column) => column.name);
		const chunks = [
			this.table[TableName],
			...columnNames,
			foreignColumns[0].table[TableName],
			...foreignColumnNames
		];
		return name ?? `${chunks.join("_")}_fk`;
	}
};
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/unique-constraint.js
function uniqueKeyName(table, columns) {
	return `${table[TableName]}_${columns.join("_")}_unique`;
}
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/columns/common.js
var SQLiteColumnBuilder = class extends ColumnBuilder {
	static [entityKind] = "SQLiteColumnBuilder";
	foreignKeyConfigs = [];
	references(ref, actions = {}) {
		this.foreignKeyConfigs.push({
			ref,
			actions
		});
		return this;
	}
	unique(name) {
		this.config.isUnique = true;
		this.config.uniqueName = name;
		return this;
	}
	generatedAlwaysAs(as, config) {
		this.config.generated = {
			as,
			type: "always",
			mode: config?.mode ?? "virtual"
		};
		return this;
	}
	/** @internal */
	buildForeignKeys(column, table) {
		return this.foreignKeyConfigs.map(({ ref, actions }) => {
			return ((ref2, actions2) => {
				const builder = new ForeignKeyBuilder(() => {
					const foreignColumn = ref2();
					return {
						columns: [column],
						foreignColumns: [foreignColumn]
					};
				});
				if (actions2.onUpdate) builder.onUpdate(actions2.onUpdate);
				if (actions2.onDelete) builder.onDelete(actions2.onDelete);
				return builder.build(table);
			})(ref, actions);
		});
	}
};
var SQLiteColumn = class extends Column {
	constructor(table, config) {
		if (!config.uniqueName) config.uniqueName = uniqueKeyName(table, [config.name]);
		super(table, config);
		this.table = table;
	}
	static [entityKind] = "SQLiteColumn";
};
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/columns/blob.js
var SQLiteBigIntBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteBigIntBuilder";
	constructor(name) {
		super(name, "bigint", "SQLiteBigInt");
	}
	/** @internal */
	build(table) {
		return new SQLiteBigInt(table, this.config);
	}
};
var SQLiteBigInt = class extends SQLiteColumn {
	static [entityKind] = "SQLiteBigInt";
	getSQLType() {
		return "blob";
	}
	mapFromDriverValue(value) {
		if (typeof Buffer !== "undefined" && Buffer.from) {
			const buf = Buffer.isBuffer(value) ? value : value instanceof ArrayBuffer ? Buffer.from(value) : value.buffer ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
			return BigInt(buf.toString("utf8"));
		}
		return BigInt(textDecoder.decode(value));
	}
	mapToDriverValue(value) {
		return Buffer.from(value.toString());
	}
};
var SQLiteBlobJsonBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteBlobJsonBuilder";
	constructor(name) {
		super(name, "json", "SQLiteBlobJson");
	}
	/** @internal */
	build(table) {
		return new SQLiteBlobJson(table, this.config);
	}
};
var SQLiteBlobJson = class extends SQLiteColumn {
	static [entityKind] = "SQLiteBlobJson";
	getSQLType() {
		return "blob";
	}
	mapFromDriverValue(value) {
		if (typeof Buffer !== "undefined" && Buffer.from) {
			const buf = Buffer.isBuffer(value) ? value : value instanceof ArrayBuffer ? Buffer.from(value) : value.buffer ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
			return JSON.parse(buf.toString("utf8"));
		}
		return JSON.parse(textDecoder.decode(value));
	}
	mapToDriverValue(value) {
		return Buffer.from(JSON.stringify(value));
	}
};
var SQLiteBlobBufferBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteBlobBufferBuilder";
	constructor(name) {
		super(name, "buffer", "SQLiteBlobBuffer");
	}
	/** @internal */
	build(table) {
		return new SQLiteBlobBuffer(table, this.config);
	}
};
var SQLiteBlobBuffer = class extends SQLiteColumn {
	static [entityKind] = "SQLiteBlobBuffer";
	mapFromDriverValue(value) {
		if (Buffer.isBuffer(value)) return value;
		return Buffer.from(value);
	}
	getSQLType() {
		return "blob";
	}
};
function blob(a, b) {
	const { name, config } = getColumnNameAndConfig(a, b);
	if (config?.mode === "json") return new SQLiteBlobJsonBuilder(name);
	if (config?.mode === "bigint") return new SQLiteBigIntBuilder(name);
	return new SQLiteBlobBufferBuilder(name);
}
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/columns/custom.js
var SQLiteCustomColumnBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteCustomColumnBuilder";
	constructor(name, fieldConfig, customTypeParams) {
		super(name, "custom", "SQLiteCustomColumn");
		this.config.fieldConfig = fieldConfig;
		this.config.customTypeParams = customTypeParams;
	}
	/** @internal */
	build(table) {
		return new SQLiteCustomColumn(table, this.config);
	}
};
var SQLiteCustomColumn = class extends SQLiteColumn {
	static [entityKind] = "SQLiteCustomColumn";
	sqlName;
	mapTo;
	mapFrom;
	constructor(table, config) {
		super(table, config);
		this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
		this.mapTo = config.customTypeParams.toDriver;
		this.mapFrom = config.customTypeParams.fromDriver;
	}
	getSQLType() {
		return this.sqlName;
	}
	mapFromDriverValue(value) {
		return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
	}
	mapToDriverValue(value) {
		return typeof this.mapTo === "function" ? this.mapTo(value) : value;
	}
};
function customType(customTypeParams) {
	return (a, b) => {
		const { name, config } = getColumnNameAndConfig(a, b);
		return new SQLiteCustomColumnBuilder(name, config, customTypeParams);
	};
}
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/columns/integer.js
var SQLiteBaseIntegerBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteBaseIntegerBuilder";
	constructor(name, dataType, columnType) {
		super(name, dataType, columnType);
		this.config.autoIncrement = false;
	}
	primaryKey(config) {
		if (config?.autoIncrement) this.config.autoIncrement = true;
		this.config.hasDefault = true;
		return super.primaryKey();
	}
};
var SQLiteBaseInteger = class extends SQLiteColumn {
	static [entityKind] = "SQLiteBaseInteger";
	autoIncrement = this.config.autoIncrement;
	getSQLType() {
		return "integer";
	}
};
var SQLiteIntegerBuilder = class extends SQLiteBaseIntegerBuilder {
	static [entityKind] = "SQLiteIntegerBuilder";
	constructor(name) {
		super(name, "number", "SQLiteInteger");
	}
	build(table) {
		return new SQLiteInteger(table, this.config);
	}
};
var SQLiteInteger = class extends SQLiteBaseInteger {
	static [entityKind] = "SQLiteInteger";
};
var SQLiteTimestampBuilder = class extends SQLiteBaseIntegerBuilder {
	static [entityKind] = "SQLiteTimestampBuilder";
	constructor(name, mode) {
		super(name, "date", "SQLiteTimestamp");
		this.config.mode = mode;
	}
	/**
	* @deprecated Use `default()` with your own expression instead.
	*
	* Adds `DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))` to the column, which is the current epoch timestamp in milliseconds.
	*/
	defaultNow() {
		return this.default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`);
	}
	build(table) {
		return new SQLiteTimestamp(table, this.config);
	}
};
var SQLiteTimestamp = class extends SQLiteBaseInteger {
	static [entityKind] = "SQLiteTimestamp";
	mode = this.config.mode;
	mapFromDriverValue(value) {
		if (this.config.mode === "timestamp") return /* @__PURE__ */ new Date(value * 1e3);
		return new Date(value);
	}
	mapToDriverValue(value) {
		const unix = value.getTime();
		if (this.config.mode === "timestamp") return Math.floor(unix / 1e3);
		return unix;
	}
};
var SQLiteBooleanBuilder = class extends SQLiteBaseIntegerBuilder {
	static [entityKind] = "SQLiteBooleanBuilder";
	constructor(name, mode) {
		super(name, "boolean", "SQLiteBoolean");
		this.config.mode = mode;
	}
	build(table) {
		return new SQLiteBoolean(table, this.config);
	}
};
var SQLiteBoolean = class extends SQLiteBaseInteger {
	static [entityKind] = "SQLiteBoolean";
	mode = this.config.mode;
	mapFromDriverValue(value) {
		return Number(value) === 1;
	}
	mapToDriverValue(value) {
		return value ? 1 : 0;
	}
};
function integer(a, b) {
	const { name, config } = getColumnNameAndConfig(a, b);
	if (config?.mode === "timestamp" || config?.mode === "timestamp_ms") return new SQLiteTimestampBuilder(name, config.mode);
	if (config?.mode === "boolean") return new SQLiteBooleanBuilder(name, config.mode);
	return new SQLiteIntegerBuilder(name);
}
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/columns/numeric.js
var SQLiteNumericBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteNumericBuilder";
	constructor(name) {
		super(name, "string", "SQLiteNumeric");
	}
	/** @internal */
	build(table) {
		return new SQLiteNumeric(table, this.config);
	}
};
var SQLiteNumeric = class extends SQLiteColumn {
	static [entityKind] = "SQLiteNumeric";
	mapFromDriverValue(value) {
		if (typeof value === "string") return value;
		return String(value);
	}
	getSQLType() {
		return "numeric";
	}
};
var SQLiteNumericNumberBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteNumericNumberBuilder";
	constructor(name) {
		super(name, "number", "SQLiteNumericNumber");
	}
	/** @internal */
	build(table) {
		return new SQLiteNumericNumber(table, this.config);
	}
};
var SQLiteNumericNumber = class extends SQLiteColumn {
	static [entityKind] = "SQLiteNumericNumber";
	mapFromDriverValue(value) {
		if (typeof value === "number") return value;
		return Number(value);
	}
	mapToDriverValue = String;
	getSQLType() {
		return "numeric";
	}
};
var SQLiteNumericBigIntBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteNumericBigIntBuilder";
	constructor(name) {
		super(name, "bigint", "SQLiteNumericBigInt");
	}
	/** @internal */
	build(table) {
		return new SQLiteNumericBigInt(table, this.config);
	}
};
var SQLiteNumericBigInt = class extends SQLiteColumn {
	static [entityKind] = "SQLiteNumericBigInt";
	mapFromDriverValue = BigInt;
	mapToDriverValue = String;
	getSQLType() {
		return "numeric";
	}
};
function numeric(a, b) {
	const { name, config } = getColumnNameAndConfig(a, b);
	const mode = config?.mode;
	return mode === "number" ? new SQLiteNumericNumberBuilder(name) : mode === "bigint" ? new SQLiteNumericBigIntBuilder(name) : new SQLiteNumericBuilder(name);
}
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/columns/real.js
var SQLiteRealBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteRealBuilder";
	constructor(name) {
		super(name, "number", "SQLiteReal");
	}
	/** @internal */
	build(table) {
		return new SQLiteReal(table, this.config);
	}
};
var SQLiteReal = class extends SQLiteColumn {
	static [entityKind] = "SQLiteReal";
	getSQLType() {
		return "real";
	}
};
function real(name) {
	return new SQLiteRealBuilder(name ?? "");
}
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/columns/text.js
var SQLiteTextBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteTextBuilder";
	constructor(name, config) {
		super(name, "string", "SQLiteText");
		this.config.enumValues = config.enum;
		this.config.length = config.length;
	}
	/** @internal */
	build(table) {
		return new SQLiteText(table, this.config);
	}
};
var SQLiteText = class extends SQLiteColumn {
	static [entityKind] = "SQLiteText";
	enumValues = this.config.enumValues;
	length = this.config.length;
	constructor(table, config) {
		super(table, config);
	}
	getSQLType() {
		return `text${this.config.length ? `(${this.config.length})` : ""}`;
	}
};
var SQLiteTextJsonBuilder = class extends SQLiteColumnBuilder {
	static [entityKind] = "SQLiteTextJsonBuilder";
	constructor(name) {
		super(name, "json", "SQLiteTextJson");
	}
	/** @internal */
	build(table) {
		return new SQLiteTextJson(table, this.config);
	}
};
var SQLiteTextJson = class extends SQLiteColumn {
	static [entityKind] = "SQLiteTextJson";
	getSQLType() {
		return "text";
	}
	mapFromDriverValue(value) {
		return JSON.parse(value);
	}
	mapToDriverValue(value) {
		return JSON.stringify(value);
	}
};
function text(a, b = {}) {
	const { name, config } = getColumnNameAndConfig(a, b);
	if (config.mode === "json") return new SQLiteTextJsonBuilder(name);
	return new SQLiteTextBuilder(name, config);
}
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/columns/all.js
function getSQLiteColumnBuilders() {
	return {
		blob,
		customType,
		integer,
		numeric,
		real,
		text
	};
}
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/table.js
var InlineForeignKeys = Symbol.for("drizzle:SQLiteInlineForeignKeys");
var SQLiteTable = class extends Table {
	static [entityKind] = "SQLiteTable";
	/** @internal */
	static Symbol = Object.assign({}, Table.Symbol, { InlineForeignKeys });
	/** @internal */
	[Table.Symbol.Columns];
	/** @internal */
	[InlineForeignKeys] = [];
	/** @internal */
	[Table.Symbol.ExtraConfigBuilder] = void 0;
};
function sqliteTableBase(name, columns, extraConfig, schema, baseName = name) {
	const rawTable = new SQLiteTable(name, schema, baseName);
	const parsedColumns = typeof columns === "function" ? columns(getSQLiteColumnBuilders()) : columns;
	const builtColumns = Object.fromEntries(Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
		const colBuilder = colBuilderBase;
		colBuilder.setName(name2);
		const column = colBuilder.build(rawTable);
		rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
		return [name2, column];
	}));
	const table = Object.assign(rawTable, builtColumns);
	table[Table.Symbol.Columns] = builtColumns;
	table[Table.Symbol.ExtraConfigColumns] = builtColumns;
	if (extraConfig) table[SQLiteTable.Symbol.ExtraConfigBuilder] = extraConfig;
	return table;
}
var sqliteTable = (name, columns, extraConfig) => {
	return sqliteTableBase(name, columns, extraConfig);
};
//#endregion
//#region node_modules/drizzle-orm/sqlite-core/indexes.js
var IndexBuilderOn = class {
	constructor(name, unique) {
		this.name = name;
		this.unique = unique;
	}
	static [entityKind] = "SQLiteIndexBuilderOn";
	on(...columns) {
		return new IndexBuilder(this.name, columns, this.unique);
	}
};
var IndexBuilder = class {
	static [entityKind] = "SQLiteIndexBuilder";
	/** @internal */
	config;
	constructor(name, columns, unique) {
		this.config = {
			name,
			columns,
			unique,
			where: void 0
		};
	}
	/**
	* Condition for partial index.
	*/
	where(condition) {
		this.config.where = condition;
		return this;
	}
	/** @internal */
	build(table) {
		return new Index(this.config, table);
	}
};
var Index = class {
	static [entityKind] = "SQLiteIndex";
	config;
	constructor(config, table) {
		this.config = {
			...config,
			table
		};
	}
};
function index(name) {
	return new IndexBuilderOn(name, false);
}
//#endregion
//#region db/schema.ts
var schema_exports = /* @__PURE__ */ __exportAll({
	activityEvents: () => activityEvents,
	customerState: () => customerState,
	sellerState: () => sellerState,
	tryOnUsage: () => tryOnUsage
});
var customerState = sqliteTable("customer_state", {
	email: text("email").primaryKey(),
	cartJson: text("cart_json").notNull().default("[]"),
	wishlistJson: text("wishlist_json").notNull().default("[]"),
	ordersJson: text("orders_json").notNull().default("[]"),
	profileJson: text("profile_json").notNull().default("{}"),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var sellerState = sqliteTable("seller_state", {
	inviteToken: text("invite_token").primaryKey(),
	ownerEmail: text("owner_email").unique(),
	approved: integer("approved", { mode: "boolean" }).notNull().default(false),
	storeName: text("store_name").notNull(),
	stateJson: text("state_json").notNull(),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var tryOnUsage = sqliteTable("try_on_usage", {
	key: text("key").primaryKey(),
	email: text("email").notNull(),
	count: integer("count").notNull().default(0),
	windowStart: text("window_start").notNull(),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var activityEvents = sqliteTable("activity_events", {
	id: text("id").primaryKey(),
	actorHash: text("actor_hash").notNull(),
	actorKind: text("actor_kind").notNull(),
	eventType: text("event_type").notNull(),
	targetType: text("target_type"),
	targetId: text("target_id"),
	sessionHash: text("session_hash"),
	metadataJson: text("metadata_json").notNull().default("{}"),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => [index("activity_events_created_at_idx").on(table.createdAt), index("activity_events_actor_hash_idx").on(table.actorHash)]);
//#endregion
export { tryOnUsage as a, __commonJSMin as c, sellerState as i, __exportAll as l, customerState as n, SQLiteTable as o, schema_exports as r, SQLiteColumn as s, activityEvents as t, __toESM as u };
