"use client";

import { useState } from "react";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import Textarea from "@cloudscape-design/components/textarea";
import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useLoja } from "@/lib/loja-context";
import type { Categoria, Produto } from "@/lib/types";

const CATEGORIAS: Categoria[] = [
  "Frutas",
  "Verduras e Legumes",
  "Ervas e Temperos",
  "Proteínas",
  "Grãos e Cereais",
  "Derivados e Processados",
  "Bebidas",
  "Pães e Panificação",
  "Mel e Apícolas",
];

interface AdicionarProdutoProps {
  onFechar: () => void;
}

// Gera um id único a partir do nome do produto
function gerarId(nome: string): string {
  return (
    nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // remove acentos
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now()
  );
}

export default function AdicionarProduto({ onFechar }: AdicionarProdutoProps) {
  const { adicionarProduto } = useLoja();
  const [form, setForm] = useState({
    nome: "",
    preco: "",
    unidade: "",
    categoria: CATEGORIAS[0] as Categoria,
    descricao: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const preco = parseFloat(form.preco);
    if (!form.nome.trim()) return setErro("Informe o nome do produto.");
    if (isNaN(preco) || preco <= 0) return setErro("Preço deve ser positivo.");
    if (!form.unidade.trim()) return setErro("Informe a unidade (ex: 500g).");

    const novoProduto: Produto = {
      id: gerarId(form.nome),
      nome: form.nome.trim(),
      preco,
      unidade: form.unidade.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim() || undefined,
      emEstoque: true,
      quantidade: 0,
      naCestaGrande: false,
      naCestaPequena: false,
    };

    setSalvando(true);
    try {
      const res = await fetch("/api/admin/produto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: novoProduto.id,
          nome: novoProduto.nome,
          preco: novoProduto.preco,
          unidade: novoProduto.unidade,
          categoria: novoProduto.categoria,
          descricao: novoProduto.descricao,
        }),
      });
      if (!res.ok) {
        const dados = await res.json();
        throw new Error(dados.erro || "Erro ao salvar na planilha");
      }
      adicionarProduto(novoProduto);
      onFechar();
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Falha ao adicionar o produto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible onDismiss={onFechar} header="Novo Produto" size="medium">
      <form onSubmit={handleSubmit}>
        <SpaceBetween size="m">
          <FormField label="Nome *">
            <Input
              value={form.nome}
              onChange={({ detail }) => setForm({ ...form, nome: detail.value })}
              placeholder="Ex: Pitomba"
            />
          </FormField>

          <FormField label="Preço (R$) *">
            <Input
              type="number"
              step={0.5}
              value={form.preco}
              onChange={({ detail }) => setForm({ ...form, preco: detail.value })}
              placeholder="0,00"
            />
          </FormField>

          <FormField label="Unidade *">
            <Input
              value={form.unidade}
              onChange={({ detail }) => setForm({ ...form, unidade: detail.value })}
              placeholder="Ex: 500g, 1 unidade"
            />
          </FormField>

          <FormField label="Categoria *">
            <Select
              selectedOption={{ value: form.categoria, label: form.categoria }}
              onChange={({ detail }) =>
                setForm({ ...form, categoria: detail.selectedOption.value as Categoria })
              }
              options={CATEGORIAS.map((cat) => ({ value: cat, label: cat }))}
            />
          </FormField>

          <FormField label="Descrição (opcional)">
            <Textarea
              value={form.descricao}
              onChange={({ detail }) => setForm({ ...form, descricao: detail.value })}
              placeholder="Uma linha sobre o produto..."
              rows={2}
            />
          </FormField>

          {erro && <Alert type="error">{erro}</Alert>}

          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={onFechar} disabled={salvando} formAction="none">
              Cancelar
            </Button>
            <Button variant="primary" loading={salvando} formAction="submit">
              {salvando ? "Salvando..." : "Adicionar Produto"}
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      </form>
    </Modal>
  );
}
