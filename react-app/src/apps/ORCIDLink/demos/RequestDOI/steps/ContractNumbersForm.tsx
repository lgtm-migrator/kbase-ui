import { ContractNumbers } from "apps/ORCIDLink/ORCIDLinkClient";
import Empty from "components/Empty";
import Well from "components/Well";
import { Component } from "react";
import { Button, Col, Form, FormControl, Row, Stack } from "react-bootstrap";

export interface ContractNumbersFormProps {
    contractNumbers: ContractNumbers;
    addDOEContractNumber: () => void;
    removeDOEContractNumber: (index: number) => void;
    updateDOEContractNumber: (index: number, contractNumber: string) => void;
    addOtherContractNumber: () => void;
    removeOtherContractNumber: (index: number) => void;
    updateOtherContractNumber: (index: number, contractNumber: string) => void;
    onDone: () => void;
}

interface ContractNumbersFormState {

}

export default class ContractNumbersForm extends Component<ContractNumbersFormProps, ContractNumbersFormState>{

    renderDOEForm() {

        const rows = (() => {
            if (this.props.contractNumbers.doe.length === 0) {
                return <Empty message="No DOE contract numbers" />
            }
            return this.props.contractNumbers.doe.map((contractNumber, index) => {
                return <Row>
                    <Col>
                        <Form.Group as={Row} >
                            <Col>
                                <FormControl type="text"
                                    value={contractNumber}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            this.props.addDOEContractNumber();
                                        }
                                    }}
                                    onInput={(e) => { this.props.updateDOEContractNumber(index, e.currentTarget.value) }} />
                            </Col>
                            <Col md="auto">
                                <Button variant="danger"
                                    onClick={() => this.props.removeDOEContractNumber(index)}><span className="fa fa-trash" /></Button>
                            </Col>
                        </Form.Group>
                    </Col>
                </Row>
            })
        })();


        return <Stack gap={2}>
            {rows}
            <Row style={{ justifyContent: 'center' }} >
                <Button variant="primary" className="w-auto" onClick={() => this.props.addDOEContractNumber()}><span className="fa fa-plus" /> Add</Button>
            </Row>

        </Stack>
    }

    renderOtherForm() {
        const rows = (() => {
            if (this.props.contractNumbers.other.length === 0) {
                return <Empty message="No non-DOE contract numbers" />
            }
            return this.props.contractNumbers.other.map((contractNumber, index) => {
                return <Row>
                    <Col>
                        <Form.Group as={Row} >
                            <Col>
                                <FormControl type="text"
                                    value={contractNumber}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            this.props.addOtherContractNumber();
                                        }
                                    }}
                                    onInput={(e) => { this.props.updateOtherContractNumber(index, e.currentTarget.value) }} />
                            </Col>
                            <Col md="auto">
                                <Button variant="danger"
                                    onClick={() => this.props.removeOtherContractNumber(index)}><span className="fa fa-trash" /></Button>
                            </Col>
                        </Form.Group>
                    </Col>
                </Row>
            })
        })();

        return <Stack gap={2}>
            {rows}
            <Row style={{ justifyContent: 'center' }} >
                <Button variant="primary" className="w-auto" onClick={() => this.props.addOtherContractNumber()}><span className="fa fa-plus" /> Add</Button>
            </Row>

        </Stack>
    }

    render() {
        return <Well style={{ padding: '1em', marginBottom: '1em' }}>
            <Stack gap={2}>
                <Row>
                    <Col md={6}>
                        <h3>DOE Contract Numbers</h3>
                        {this.renderDOEForm()}
                    </Col>
                    <Col md={6}>
                        <h3>Other Contract Numbers</h3>
                        {this.renderOtherForm()}
                    </Col>
                </Row>
                <Row>
                    <Col md={12}>
                        <Row style={{ justifyContent: 'center' }} >
                            <Button variant="primary" className="w-auto" onClick={this.props.onDone}>Next <span className="fa fa-hand-o-down" /></Button>
                        </Row>
                    </Col>
                </Row>
            </Stack>
        </Well>
    }
}
