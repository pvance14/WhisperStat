export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GameStatus = "draft" | "in_progress" | "completed";
export type StatEventType =
  | "kill"
  | "ace"
  | "serve_error"
  | "reception_error"
  | "serve_receive"
  | "block"
  | "dig"
  | "attack_error"
  | "set";

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          user_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          first_name: string;
          last_name: string;
          jersey_number: number;
          position: string | null;
          aliases: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          first_name: string;
          last_name: string;
          jersey_number: number;
          position?: string | null;
          aliases?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          first_name?: string;
          last_name?: string;
          jersey_number?: number;
          position?: string | null;
          aliases?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          team_id: string;
          opponent_name: string;
          game_date: string;
          location: string | null;
          status: GameStatus;
          current_set: number;
          score_by_set: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          opponent_name: string;
          game_date: string;
          location?: string | null;
          status?: GameStatus;
          current_set?: number;
          score_by_set?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          opponent_name?: string;
          game_date?: string;
          location?: string | null;
          status?: GameStatus;
          current_set?: number;
          score_by_set?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stat_events: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          event_type: StatEventType;
          set_number: number;
          timestamp: string;
          created_by: string;
          notes: string | null;
          deleted_at: string | null;
          client_event_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id: string;
          event_type: StatEventType;
          set_number: number;
          timestamp: string;
          created_by?: string;
          notes?: string | null;
          deleted_at?: string | null;
          client_event_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          player_id?: string;
          event_type?: StatEventType;
          set_number?: number;
          timestamp?: string;
          created_by?: string;
          notes?: string | null;
          deleted_at?: string | null;
          client_event_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      game_summaries: {
        Row: {
          id: string;
          game_id: string;
          narrative_text: string;
          generated_at: string;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          narrative_text: string;
          generated_at: string;
          model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          narrative_text?: string;
          generated_at?: string;
          model?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      confirm_stat_event_batch: {
        Args: {
          target_game_id: string;
          target_set_number: number;
          capture_created_at: string;
          target_client_capture_id: string;
          proposals: Json;
        };
        Returns: {
          id: string;
          game_id: string;
          player_id: string;
          event_type: StatEventType;
          set_number: number;
          timestamp: string;
          created_by: string;
          notes: string | null;
          deleted_at: string | null;
          client_event_id: string | null;
          created_at: string;
        }[];
      };
    };
    Enums: {
      game_status: GameStatus;
      stat_event_type: StatEventType;
    };
    CompositeTypes: Record<string, never>;
  };
}
