import os
from typing import List, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import asyncio

class AgentOrchestrator:
    def __init__(self):
        self.llm_key = os.environ.get('EMERGENT_LLM_KEY')
        
    async def decompose_query(self, query: str, user_subscribed_agents: List[Dict], personalized: bool = False) -> List[Dict]:
        """
        Use GPT-4o-mini for faster decomposition (instead of GPT-5)
        """
        chat = LlmChat(
            api_key=self.llm_key,
            session_id=f"query_decompose_{hash(query)}",
            system_message="""You are a smart agent router. Analyze the query and return a JSON array of 1-3 agents.

Return ONLY valid JSON array:
[{"agent_id": "agent_name", "agent_name": "Display Name", "purpose": "brief purpose"}]

Available agents: Perplexity, GPT Researcher, Scira AI, Exa, OpenAI Research"""
        )
        
        # Use gpt-4o-mini for faster routing
        chat.with_model("openai", "gpt-4o-mini")
        
        message = UserMessage(text=f"Query: {query}\n\nReturn agent chain JSON:")
        
        try:
            response = await chat.send_message(message)
            content = response.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            agent_chain = json.loads(content.strip())
            return agent_chain[:3]  # Max 3 agents
        except Exception as e:
            # Fast fallback
            return [{
                "agent_id": "perplexity",
                "agent_name": "Perplexity",
                "purpose": "Answer the query"
            }]
    
    async def execute_agent_chain(self, query: str, agent_chain: List[Dict], fetch_ui: bool = False) -> Dict[str, Any]:
        """
        Execute the agent chain and aggregate results
        For MVP, we'll simulate agent responses since actual integration requires each agent's SDK
        """
        results = []
        
        for agent_info in agent_chain:
            # Simulate agent execution
            agent_result = {
                "agent_name": agent_info["agent_name"],
                "purpose": agent_info["purpose"],
                "content": f"**Analysis from {agent_info['agent_name']}**\\n\\nThis is a simulated response for the purpose: {agent_info['purpose']}\\n\\nFor query: {query}\\n\\n*In production, this would call the actual {agent_info['agent_name']} API.*",
                "sources": [],
                "data": None
            }
            results.append(agent_result)
        
        # Use GPT-5 to synthesize and format the final response
        synthesized_response = await self.synthesize_response(query, results, fetch_ui)
        
        return {
            "agent_chain": agent_chain,
            "results": results,
            "synthesized": synthesized_response,
            "status": "completed"
        }
    
    async def synthesize_response(self, query: str, agent_results: List[Dict], fetch_ui: bool = False) -> Dict[str, Any]:
        """
        Use GPT-5 to synthesize all agent results into a cohesive response
        If fetch_ui is True, also generate UI components (graphs, tables, etc.)
        """
        chat = LlmChat(
            api_key=self.llm_key,
            session_id=f"synthesize_{hash(query)}",
            system_message="""You are a UI generation agent for Sagent AI. Your job is to:
1. Synthesize all agent results into a cohesive, well-formatted response
2. If fetch_ui is True, suggest UI components (graphs, tables, cards) for data visualization
3. Return a JSON object with markdown content and UI components

Return JSON format:
{
  "markdown": "# Title\\n\\nContent here...",
  "ui_components": [
    {"type": "graph", "data": {...}, "config": {...}},
    {"type": "table", "data": [...]}
  ],
  "summary": "Brief summary"
}"""
        )
        
        try:
            chat.with_model("openai", "gpt-5")
        except:
            chat.with_model("openai", "gpt-4o")
        
        results_text = "\\n\\n".join([
            f"**{r['agent_name']}** ({r['purpose']}):\\n{r['content']}" 
            for r in agent_results
        ])
        
        message = UserMessage(
            text=f"""Query: {query}
Fetch UI: {fetch_ui}

Agent Results:
{results_text}

Synthesize into a cohesive response with {'' if not fetch_ui else 'UI components for visualizations.'}"""
        )
        
        response = await chat.send_message(message)
        
        # Parse JSON response
        try:
            content = response.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            synthesized = json.loads(content.strip())
            return synthesized
        except:
            # Fallback response
            return {
                "markdown": f"# Results for: {query}\\n\\n" + results_text,
                "ui_components": [],
                "summary": "Analysis completed"
            }
    
    async def apply_edit_operation(self, original_content: Dict, section_id: str, operation: str, instruction: str = None) -> Dict:
        """
        Apply edit operations: iterate, delete, dissolve
        """
        chat = LlmChat(
            api_key=self.llm_key,
            session_id=f"edit_{section_id}",
            system_message=f"""You are an edit agent for Sagent AI. 
Operation: {operation}
- iterate: Improve/modify the selected section based on user instruction
- delete: Remove the section and reformat the content
- dissolve: Integrate the section content into other parts smoothly

Return the updated content in the same JSON format."""
        )
        
        try:
            chat.with_model("openai", "gpt-5")
        except:
            chat.with_model("openai", "gpt-4o")
        
        message = UserMessage(
            text=f"""Original content: {json.dumps(original_content)}
Section ID: {section_id}
Operation: {operation}
Instruction: {instruction or 'N/A'}

Apply the operation and return updated content."""
        )
        
        response = await chat.send_message(message)
        
        try:
            content = response.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            return json.loads(content.strip())
        except:
            return original_content
