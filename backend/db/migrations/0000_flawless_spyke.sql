CREATE TABLE "agent_daily_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"date" text NOT NULL,
	"calls_used" numeric DEFAULT '0',
	"trades_used" numeric DEFAULT '0',
	"max_calls" numeric DEFAULT '10',
	"max_trades" numeric DEFAULT '20',
	"violations" text[] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"week" text NOT NULL,
	"strengths" text[],
	"mistakes" text[],
	"coach_notes" text,
	"metrics" text
);
--> statement-breakpoint
CREATE TABLE "agent_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"wake_time" timestamp with time zone NOT NULL,
	"source" text,
	"reason" text,
	"used" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"model" text NOT NULL,
	"system_prompt" text NOT NULL,
	"persona" text,
	"capital" numeric(12, 2) DEFAULT '1000000.00',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"snapshot_id" uuid,
	"model" text NOT NULL,
	"prompt_version" text DEFAULT 'v1',
	"system_prompt" text,
	"user_prompt" text,
	"raw_output" text,
	"parsed_decision" jsonb,
	"token_usage" jsonb,
	"cost" numeric(10, 6),
	"response_time_ms" integer,
	"status" text DEFAULT 'success',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"decision_id" uuid,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"amount" numeric(12, 2),
	"quantity" integer,
	"requested_price" numeric(10, 2),
	"executed_price" numeric(10, 2),
	"slippage" numeric(6, 4),
	"status" text DEFAULT 'pending',
	"executed_at" timestamp with time zone,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "leaderboard_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"agent_id" uuid,
	"rank" integer,
	"capital" numeric(12, 2),
	"return_pct" numeric(6, 2),
	"drawdown_pct" numeric(6, 2),
	"turnover_pct" numeric(6, 2),
	"hit_rate" numeric(5, 2),
	CONSTRAINT "leaderboard_daily_date_agent_id_unique" UNIQUE("date","agent_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_weekly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week" text NOT NULL,
	"agent_id" uuid,
	"rank" integer,
	"starting_capital" numeric(12, 2),
	"ending_capital" numeric(12, 2),
	"return_pct" numeric(6, 2),
	"peak_capital" numeric(12, 2),
	"max_drawdown_pct" numeric(6, 2),
	"total_trades" integer,
	"win_rate" numeric(5, 2),
	"consistency_score" numeric(5, 2),
	CONSTRAINT "leaderboard_weekly_week_agent_id_unique" UNIQUE("week","agent_id")
);
--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"universe" text[] NOT NULL,
	"benchmark" jsonb,
	"quotes" jsonb NOT NULL,
	"movers" jsonb,
	"sector_summary" jsonb,
	"news_bundle" jsonb,
	"snapshot_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exit_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid,
	"target_price" numeric(10, 2),
	"stop_loss_price" numeric(10, 2),
	"exit_at" timestamp with time zone,
	"trailing_stop_pct" numeric(5, 2),
	"triggered_by" text,
	"triggered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"symbol" text NOT NULL,
	"quantity" integer NOT NULL,
	"entry_price" numeric(10, 2) NOT NULL,
	"current_price" numeric(10, 2),
	"strategy_type" text,
	"realized_pnl" numeric(12, 2) DEFAULT '0',
	"unrealized_pnl" numeric(12, 2) DEFAULT '0',
	"status" text DEFAULT 'open',
	"entered_at" timestamp with time zone DEFAULT now(),
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_daily_limits" ADD CONSTRAINT "agent_daily_limits_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_schedules" ADD CONSTRAINT "agent_schedules_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_snapshot_id_market_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."market_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_decision_id_agent_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."agent_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_daily" ADD CONSTRAINT "leaderboard_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_weekly" ADD CONSTRAINT "leaderboard_weekly_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_rules" ADD CONSTRAINT "exit_rules_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;