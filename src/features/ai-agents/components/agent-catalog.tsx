'use client';

import { useState } from 'react';
import { Bot, Search } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

import type { AiAgent } from '../domain';
import { agentCatalogStyles as styles } from './agent-catalog.styles';

export interface AgentCatalogProps {
  readonly agents: readonly AiAgent[];
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function matchesSearch(agent: AiAgent, query: string): boolean {
  const searchableContent = [
    agent.name,
    agent.category,
    agent.description,
    ...agent.capabilities,
  ].join(' ');

  return normalizeSearchValue(searchableContent).includes(query);
}

function getResultLabel(count: number): string {
  return count === 1 ? '1 agente encontrado' : `${count} agentes encontrados`;
}

export function AgentCatalog({ agents }: AgentCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const filteredAgents =
    normalizedSearchTerm.length === 0
      ? agents
      : agents.filter((agent) => matchesSearch(agent, normalizedSearchTerm));

  return (
    <section aria-labelledby="agent-catalog-title" className={styles.section()}>
      <div className={styles.searchHeader()}>
        <div className={styles.field()}>
          <label id="agent-catalog-title" htmlFor="agent-catalog-search" className={styles.label()}>
            Buscar no catálogo
          </label>
          <div className={styles.inputContainer()}>
            <Search aria-hidden="true" className={styles.searchIcon()} />
            <Input
              id="agent-catalog-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nome, área ou capacidade"
              className={styles.input()}
            />
          </div>
        </div>

        <p aria-live="polite" className={styles.resultCount()}>
          {getResultLabel(filteredAgents.length)}
        </p>
      </div>

      {filteredAgents.length > 0 ? (
        <div className={styles.grid()}>
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className={styles.card()}>
              <CardHeader className={styles.cardHeader()}>
                <div className={styles.cardHeading()}>
                  <span className={styles.cardIcon()}>
                    <Bot aria-hidden="true" />
                  </span>
                  <span className={styles.status()}>Em preparação</span>
                </div>
                <p className={styles.category()}>{agent.category}</p>
                <CardTitle className={styles.title()}>{agent.name}</CardTitle>
                <CardDescription className={styles.description()}>
                  {agent.description}
                </CardDescription>
              </CardHeader>
              <CardContent className={styles.cardContent()}>
                <p className={styles.scopeTitle()}>Escopo previsto</p>
                <ul className={styles.capabilityList()}>
                  {agent.capabilities.map((capability) => (
                    <li key={capability} className={styles.capability()}>
                      <span aria-hidden="true" className={styles.capabilityIcon()} />
                      {capability}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState()}>
          <p className={styles.emptyTitle()}>Nenhum agente encontrado</p>
          <p className={styles.emptyDescription()}>
            Tente buscar por outro nome, área ou capacidade.
          </p>
        </div>
      )}
    </section>
  );
}
